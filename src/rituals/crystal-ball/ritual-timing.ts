export const ritualTiming = {
  holdToBeginMs: 620,
  focusMs: 1080,
  gatherMs: 1620,
  revealMs: 1470,
} as const;

export const ritualDurationMs =
  ritualTiming.focusMs + ritualTiming.gatherMs + ritualTiming.revealMs;
