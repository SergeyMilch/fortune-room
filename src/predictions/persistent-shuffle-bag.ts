export type RandomSource = () => number;

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type PredictionEntry = {
  id: string;
  text: string;
  category: string;
  tone: string;
};

type StoredDeckState = {
  version: 1;
  knownIds: string[];
  remainingIds: string[];
  recentIds: string[];
};

type Reservation<TEntry extends PredictionEntry> = {
  entry: TEntry;
  remainingAfterCommit: string[];
};

const STATE_VERSION = 1;

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function uniqueValidIds(ids: readonly string[], validIds: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function createCycleDeck(
  allIds: readonly string[],
  recentIds: readonly string[],
  protectedPrefixSize: number,
  random: RandomSource,
): string[] {
  const recentSet = new Set(recentIds);
  const nonRecent = shuffle(allIds.filter((id) => !recentSet.has(id)), random);
  const protectedCount = Math.min(protectedPrefixSize, nonRecent.length);
  const protectedPrefix = nonRecent.slice(0, protectedCount);
  const rest = shuffle(
    [...nonRecent.slice(protectedCount), ...allIds.filter((id) => recentSet.has(id))],
    random,
  );
  return [...protectedPrefix, ...rest];
}

function mergeNewIds(
  remainingIds: readonly string[],
  newIds: readonly string[],
  random: RandomSource,
): string[] {
  const merged = [...remainingIds];
  for (const id of shuffle(newIds, random)) {
    const insertionIndex = Math.floor(random() * (merged.length + 1));
    merged.splice(insertionIndex, 0, id);
  }
  return merged;
}

function parseStoredState(value: string | null): StoredDeckState | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== STATE_VERSION ||
      !("knownIds" in parsed) ||
      !Array.isArray(parsed.knownIds) ||
      !("remainingIds" in parsed) ||
      !Array.isArray(parsed.remainingIds) ||
      !("recentIds" in parsed) ||
      !Array.isArray(parsed.recentIds)
    ) {
      return null;
    }
    if (
      !parsed.knownIds.every((id) => typeof id === "string") ||
      !parsed.remainingIds.every((id) => typeof id === "string") ||
      !parsed.recentIds.every((id) => typeof id === "string")
    ) {
      return null;
    }
    return parsed as StoredDeckState;
  } catch {
    return null;
  }
}

export class PersistentShuffleBag<TEntry extends PredictionEntry = PredictionEntry> {
  private readonly entriesById: ReadonlyMap<string, TEntry>;
  private readonly allIds: readonly string[];
  private state: StoredDeckState | null = null;
  private reservation: Reservation<TEntry> | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    entries: readonly TEntry[],
    private readonly storage: KeyValueStorage,
    private readonly storageKey: string,
    private readonly recentLimit = 40,
    private readonly random: RandomSource = Math.random,
  ) {
    this.entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    this.allIds = entries.map((entry) => entry.id);
    if (this.entriesById.size !== entries.length) {
      throw new Error("Prediction content pack contains duplicate IDs.");
    }
    if (entries.length === 0) {
      throw new Error("Prediction content pack is empty.");
    }
  }

  prepare(): Promise<void> {
    return this.runExclusive(async () => {
      await this.ensureState();
    });
  }

  reserve(): Promise<TEntry> {
    return this.runExclusive(async () => {
      const state = await this.ensureState();
      if (this.reservation) return this.reservation.entry;

      const deck =
        state.remainingIds.length > 0
          ? state.remainingIds
          : createCycleDeck(this.allIds, state.recentIds, this.recentLimit, this.random);
      const reservedId = deck[0];
      const entry = this.entriesById.get(reservedId);
      if (!entry) throw new Error(`Prediction entry not found: ${reservedId}`);

      this.reservation = {
        entry,
        remainingAfterCommit: deck.slice(1),
      };
      return entry;
    });
  }

  commit(): Promise<TEntry | null> {
    return this.runExclusive(async () => {
      const state = await this.ensureState();
      if (!this.reservation) return null;

      const committedEntry = this.reservation.entry;
      const nextState: StoredDeckState = {
        ...state,
        remainingIds: this.reservation.remainingAfterCommit,
        recentIds: [...state.recentIds, committedEntry.id].slice(-this.recentLimit),
      };
      await this.persist(nextState);
      this.state = nextState;
      this.reservation = null;
      return committedEntry;
    });
  }

  abort(): Promise<void> {
    return this.runExclusive(async () => {
      this.reservation = null;
    });
  }

  private async ensureState(): Promise<StoredDeckState> {
    if (this.state) return this.state;

    const storedValue = await this.storage.getItem(this.storageKey);
    const storedState = parseStoredState(storedValue);
    const currentIdSet = new Set(this.allIds);

    if (!storedState) {
      this.state = {
        version: STATE_VERSION,
        knownIds: [...this.allIds],
        remainingIds: [],
        recentIds: [],
      };
      return this.state;
    }

    const validRemaining = uniqueValidIds(storedState.remainingIds, currentIdSet);
    const validRecent = uniqueValidIds(storedState.recentIds, currentIdSet).slice(-this.recentLimit);
    const previouslyKnown = new Set(storedState.knownIds);
    const newIds = this.allIds.filter((id) => !previouslyKnown.has(id));
    const reconciledState: StoredDeckState = {
      version: STATE_VERSION,
      knownIds: [...this.allIds],
      remainingIds: mergeNewIds(validRemaining, newIds, this.random),
      recentIds: validRecent,
    };

    if (JSON.stringify(reconciledState) !== JSON.stringify(storedState)) {
      await this.persist(reconciledState);
    }
    this.state = reconciledState;
    return reconciledState;
  }

  private async persist(state: StoredDeckState): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(state));
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
