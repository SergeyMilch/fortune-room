import type { KeyValueStorage, RandomSource } from "@/predictions/persistent-shuffle-bag";

import type {
  FortuneBookDiagnostics,
  FortuneBookEntry,
  FortuneBookShuffleState,
  FortuneBookSpread,
  FortuneBookTone,
} from "./fortune-book-content-types";

const STATE_VERSION = 1 as const;
const SPREAD_SIZE = 20;
const PAGE_SIZE = 10;
const RECENT_LIMIT = 40;
const LOOKAHEAD_SIZE = 80;

const toneTargets: Record<FortuneBookTone, { min: number; max: number }> = {
  hopeful: { min: 5, max: 7 },
  neutral: { min: 4, max: 6 },
  mysterious: { min: 3, max: 5 },
  cautionary: { min: 3, max: 5 },
  dark: { min: 0, max: 2 },
};

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createCycleOrder(allIds: readonly string[], recentIds: readonly string[], random: RandomSource): string[] {
  const recent = new Set(recentIds);
  const nonRecent = shuffle(allIds.filter((id) => !recent.has(id)), random);
  const protectedPrefix = nonRecent.slice(0, Math.min(RECENT_LIMIT, nonRecent.length));
  const remainder = shuffle(
    [...nonRecent.slice(protectedPrefix.length), ...allIds.filter((id) => recent.has(id))],
    random,
  );
  return [...protectedPrefix, ...remainder];
}

function isValidState(value: unknown, validIds: ReadonlySet<string>, expectedLength: number): value is FortuneBookShuffleState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<FortuneBookShuffleState>;
  if (
    state.version !== STATE_VERSION ||
    !Number.isInteger(state.cycle) || (state.cycle ?? 0) < 1 ||
    !Number.isInteger(state.cursor) || (state.cursor ?? -1) < 0 || (state.cursor ?? 0) > expectedLength ||
    !Array.isArray(state.order) || state.order.length !== expectedLength ||
    !Array.isArray(state.recentIds) || state.recentIds.length > RECENT_LIMIT
  ) return false;
  const order = new Set(state.order);
  const recent = new Set(state.recentIds);
  return order.size === expectedLength && recent.size === state.recentIds.length &&
    state.order.every((id) => typeof id === "string" && validIds.has(id)) &&
    state.recentIds.every((id) => typeof id === "string" && validIds.has(id));
}

function candidatePenalty(
  entry: FortuneBookEntry,
  themeCounts: ReadonlyMap<string, number>,
  toneCounts: ReadonlyMap<FortuneBookTone, number>,
  previousTheme: string | null,
): number {
  const themeCount = themeCounts.get(entry.theme) ?? 0;
  const toneCount = toneCounts.get(entry.tone) ?? 0;
  const target = toneTargets[entry.tone];
  let score = themeCount >= 2 ? 100 + themeCount * 20 : themeCount * 3;
  if (entry.theme === previousTheme) score += 18;
  if (toneCount >= target.max) score += 12 + (toneCount - target.max) * 4;
  if (toneCount < target.min) score -= 4;
  return score;
}

function balanceNextSpread(
  order: readonly string[],
  cursor: number,
  entriesById: ReadonlyMap<string, FortuneBookEntry>,
): string[] {
  const balanced = [...order];
  const themeCounts = new Map<string, number>();
  const toneCounts = new Map<FortuneBookTone, number>();
  let previousTheme: string | null = null;
  const spreadEnd = Math.min(cursor + SPREAD_SIZE, balanced.length);

  for (let position = cursor; position < spreadEnd; position += 1) {
    const boundaryEnd = cursor < RECENT_LIMIT ? RECENT_LIMIT : cursor + LOOKAHEAD_SIZE;
    const searchEnd = Math.min(balanced.length, Math.max(spreadEnd, boundaryEnd));
    let bestIndex = position;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = position; index < searchEnd; index += 1) {
      const entry = entriesById.get(balanced[index]);
      if (!entry) continue;
      const score = candidatePenalty(entry, themeCounts, toneCounts, previousTheme);
      if (score < bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }
    [balanced[position], balanced[bestIndex]] = [balanced[bestIndex], balanced[position]];
    const chosen = entriesById.get(balanced[position]);
    if (!chosen) throw new Error(`Fortune Book entry not found: ${balanced[position]}`);
    themeCounts.set(chosen.theme, (themeCounts.get(chosen.theme) ?? 0) + 1);
    toneCounts.set(chosen.tone, (toneCounts.get(chosen.tone) ?? 0) + 1);
    previousTheme = chosen.theme;
  }
  return balanced;
}

export class FortuneBookContentEngine {
  private readonly entriesById: ReadonlyMap<string, FortuneBookEntry>;
  private readonly allIds: readonly string[];
  private readonly validIds: ReadonlySet<string>;
  private state: FortuneBookShuffleState | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    entries: readonly FortuneBookEntry[],
    private readonly storage: KeyValueStorage,
    private readonly storageKey: string,
    private readonly random: RandomSource = Math.random,
  ) {
    this.entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    this.allIds = entries.map((entry) => entry.id);
    this.validIds = new Set(this.allIds);
    if (entries.length === 0 || this.entriesById.size !== entries.length) {
      throw new Error("Fortune Book content must be non-empty and have unique IDs.");
    }
  }

  initialize(): Promise<FortuneBookDiagnostics> {
    return this.runExclusive(async () => this.toDiagnostics(await this.ensureState(), null));
  }

  createNextSpread(): Promise<FortuneBookSpread> {
    return this.runExclusive(async () => {
      let state = await this.ensureState();
      if (state.cursor >= this.allIds.length) {
        state = {
          version: STATE_VERSION,
          cycle: state.cycle + 1,
          order: createCycleOrder(this.allIds, state.recentIds, this.random),
          cursor: 0,
          recentIds: state.recentIds,
        };
      }
      const order = balanceNextSpread(state.order, state.cursor, this.entriesById);
      const ids = order.slice(state.cursor, state.cursor + SPREAD_SIZE);
      if (ids.length !== SPREAD_SIZE) throw new Error("Fortune Book cycle is not divisible into 20-entry spreads.");
      const entries = ids.map((id) => {
        const entry = this.entriesById.get(id);
        if (!entry) throw new Error(`Fortune Book entry not found: ${id}`);
        return entry;
      });
      const nextState: FortuneBookShuffleState = {
        ...state,
        order,
        cursor: state.cursor + SPREAD_SIZE,
        recentIds: [...state.recentIds, ...ids].slice(-RECENT_LIMIT),
      };
      await this.persist(nextState);
      this.state = nextState;
      return {
        cycle: nextState.cycle,
        spread: nextState.cursor / SPREAD_SIZE,
        entries,
        left: entries.slice(0, PAGE_SIZE),
        right: entries.slice(PAGE_SIZE),
      };
    });
  }

  getById(id: string): FortuneBookEntry | null {
    return this.entriesById.get(id) ?? null;
  }

  getDiagnostics(selected: string | null = null): Promise<FortuneBookDiagnostics> {
    return this.runExclusive(async () => this.toDiagnostics(await this.ensureState(), selected));
  }

  resetDev(): Promise<FortuneBookDiagnostics> {
    return this.runExclusive(async () => {
      const state = this.createInitialState();
      await this.persist(state);
      this.state = state;
      return this.toDiagnostics(state, null);
    });
  }

  private async ensureState(): Promise<FortuneBookShuffleState> {
    if (this.state) return this.state;
    let parsed: unknown = null;
    try {
      const stored = await this.storage.getItem(this.storageKey);
      parsed = stored ? JSON.parse(stored) : null;
    } catch {
      parsed = null;
    }
    if (isValidState(parsed, this.validIds, this.allIds.length)) {
      this.state = parsed;
      return parsed;
    }
    const state = this.createInitialState();
    await this.persist(state);
    this.state = state;
    return state;
  }

  private createInitialState(): FortuneBookShuffleState {
    return {
      version: STATE_VERSION,
      cycle: 1,
      order: createCycleOrder(this.allIds, [], this.random),
      cursor: 0,
      recentIds: [],
    };
  }

  private toDiagnostics(state: FortuneBookShuffleState, selected: string | null): FortuneBookDiagnostics {
    return {
      cycle: state.cycle,
      cursor: state.cursor,
      total: this.allIds.length,
      spread: state.cursor / SPREAD_SIZE,
      remaining: this.allIds.length - state.cursor,
      selected,
    };
  }

  private async persist(state: FortuneBookShuffleState): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(state));
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
