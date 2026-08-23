export const ritualIds = [
  "crystalBall",
  "fortuneBook",
  "fortuneCookie",
  "runes",
  "coin",
] as const;

export const FREE_RITUAL_RESULTS_PER_HOUR = 2;
export const FREE_RITUAL_WINDOW_MS = 60 * 60 * 1000;

export type RitualId = typeof ritualIds[number];

type RitualFreeWindow = {
  startedAt: number | null;
  resultsUsed: number;
};

export type RitualAccessState = {
  version: 2;
  freeWindows: Record<RitualId, RitualFreeWindow>;
  credits: Record<RitualId, number>;
};

export type AttemptAccess = "free" | "reward" | "reward-required";

export function createRitualAccessState(): RitualAccessState {
  return {
    version: 2,
    freeWindows: {
      crystalBall: createFreeWindow(),
      fortuneBook: createFreeWindow(),
      fortuneCookie: createFreeWindow(),
      runes: createFreeWindow(),
      coin: createFreeWindow(),
    },
    credits: {
      crystalBall: 0,
      fortuneBook: 0,
      fortuneCookie: 0,
      runes: 0,
      coin: 0,
    },
  };
}

function createFreeWindow(): RitualFreeWindow {
  return { startedAt: null, resultsUsed: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeRitualAccessState(value: unknown, now = Date.now()) {
  if (!isRecord(value) || value.version !== 2) return createRitualAccessState();

  const freeWindows = isRecord(value.freeWindows) ? value.freeWindows : {};
  const credits = isRecord(value.credits) ? value.credits : {};
  const normalized = createRitualAccessState();

  for (const ritualId of ritualIds) {
    normalized.freeWindows[ritualId] = normalizeFreeWindow(freeWindows[ritualId], now);
    const credit = credits[ritualId];
    normalized.credits[ritualId] = typeof credit === "number" && credit > 0 ? 1 : 0;
  }

  return normalized;
}

export function beginRitualAttempt(
  state: RitualAccessState,
  ritualId: RitualId,
  now = Date.now(),
) {
  const current = refreshFreeWindow(state, ritualId, now);
  if (current.freeWindows[ritualId].resultsUsed < FREE_RITUAL_RESULTS_PER_HOUR) {
    return { state: current, access: "free" as const };
  }
  if (current.credits[ritualId] === 0) {
    return { state: current, access: "reward-required" as const };
  }
  const next = cloneState(current);
  next.credits[ritualId] = 0;
  return { state: next, access: "reward" as const };
}

export function recordRitualResult(
  state: RitualAccessState,
  ritualId: RitualId,
  now = Date.now(),
) {
  const current = refreshFreeWindow(state, ritualId, now);
  const window = current.freeWindows[ritualId];
  if (window.resultsUsed >= FREE_RITUAL_RESULTS_PER_HOUR) return current;

  const next = cloneState(current);
  next.freeWindows[ritualId] = {
    startedAt: window.startedAt ?? now,
    resultsUsed: window.resultsUsed + 1,
  };
  return next;
}

export function grantRitualAttempt(state: RitualAccessState, ritualId: RitualId) {
  if (state.credits[ritualId] === 1) return state;
  const next = cloneState(state);
  next.credits[ritualId] = 1;
  return next;
}

function normalizeFreeWindow(value: unknown, now: number): RitualFreeWindow {
  if (!isRecord(value)) return createFreeWindow();

  const resultsUsed = typeof value.resultsUsed === "number"
    ? Math.min(FREE_RITUAL_RESULTS_PER_HOUR, Math.max(0, Math.floor(value.resultsUsed)))
    : 0;
  const startedAt = typeof value.startedAt === "number" && Number.isFinite(value.startedAt)
    ? value.startedAt
    : null;

  if (resultsUsed === 0 || startedAt === null) return createFreeWindow();
  if (now - startedAt >= FREE_RITUAL_WINDOW_MS) return createFreeWindow();

  // Moving the device clock backwards must not restore free attempts.
  return { startedAt: now < startedAt ? now : startedAt, resultsUsed };
}

function refreshFreeWindow(state: RitualAccessState, ritualId: RitualId, now: number) {
  const currentWindow = state.freeWindows[ritualId];
  const normalizedWindow = normalizeFreeWindow(currentWindow, now);
  if (
    normalizedWindow.startedAt === currentWindow.startedAt
    && normalizedWindow.resultsUsed === currentWindow.resultsUsed
  ) {
    return state;
  }

  const next = cloneState(state);
  next.freeWindows[ritualId] = normalizedWindow;
  return next;
}

function cloneState(state: RitualAccessState): RitualAccessState {
  return {
    ...state,
    freeWindows: Object.fromEntries(
      ritualIds.map((ritualId) => [ritualId, { ...state.freeWindows[ritualId] }]),
    ) as RitualAccessState["freeWindows"],
    credits: { ...state.credits },
  };
}
