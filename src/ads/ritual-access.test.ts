import { describe, expect, it } from "vitest";

import {
  beginRitualAttempt,
  createRitualAccessState,
  FREE_RITUAL_WINDOW_MS,
  grantRitualAttempt,
  normalizeRitualAccessState,
  recordRitualResult,
} from "./ritual-access";

const hourStart = new Date(2026, 7, 23, 14, 15, 0).getTime();

describe("hourly ritual access", () => {
  it("starts every ritual with two free results available", () => {
    const state = createRitualAccessState();
    expect(Object.values(state.freeWindows).map((window) => window.resultsUsed))
      .toEqual([0, 0, 0, 0, 0]);
    expect(Object.values(state.credits)).toEqual([0, 0, 0, 0, 0]);
  });

  it("requires a reward only after two results from that ritual", () => {
    let state = createRitualAccessState();
    expect(beginRitualAttempt(state, "crystalBall", hourStart).access).toBe("free");

    state = recordRitualResult(state, "crystalBall", hourStart);
    expect(beginRitualAttempt(state, "crystalBall", hourStart + 1).access).toBe("free");

    state = recordRitualResult(state, "crystalBall", hourStart + 1);
    expect(beginRitualAttempt(state, "crystalBall", hourStart + 2).access)
      .toBe("reward-required");
    expect(beginRitualAttempt(state, "fortuneBook", hourStart + 2).access).toBe("free");
  });

  it("resets only that ritual after sixty minutes from its first result", () => {
    let state = recordRitualResult(createRitualAccessState(), "coin", hourStart);
    state = recordRitualResult(state, "coin", hourStart + 1);

    expect(beginRitualAttempt(state, "coin", hourStart + FREE_RITUAL_WINDOW_MS - 1).access)
      .toBe("reward-required");
    const reset = beginRitualAttempt(state, "coin", hourStart + FREE_RITUAL_WINDOW_MS);
    expect(reset.access).toBe("free");
    expect(reset.state.freeWindows.coin.resultsUsed).toBe(0);
  });

  it("persists independent windows and clamps duplicate credits", () => {
    const saved = createRitualAccessState();
    saved.freeWindows.crystalBall = { startedAt: hourStart, resultsUsed: 2 };
    saved.credits.crystalBall = 4;

    const state = normalizeRitualAccessState(saved, hourStart + 1);
    expect(state.freeWindows.crystalBall.resultsUsed).toBe(2);
    expect(state.freeWindows.fortuneBook.resultsUsed).toBe(0);
    expect(state.credits.crystalBall).toBe(1);
  });

  it("does not restore free attempts when the device clock moves backwards", () => {
    const saved = createRitualAccessState();
    saved.freeWindows.runes = { startedAt: hourStart, resultsUsed: 2 };

    const state = normalizeRitualAccessState(saved, hourStart - 10_000);
    expect(state.freeWindows.runes.resultsUsed).toBe(2);
    expect(beginRitualAttempt(state, "runes", hourStart - 9_000).access)
      .toBe("reward-required");
  });

  it("consumes exactly one credit at attempt start", () => {
    let state = recordRitualResult(createRitualAccessState(), "coin", hourStart);
    state = recordRitualResult(state, "coin", hourStart + 1);
    state = grantRitualAttempt(state, "coin");
    state = grantRitualAttempt(state, "coin");

    const granted = beginRitualAttempt(state, "coin", hourStart + 2);
    expect(granted.access).toBe("reward");
    expect(granted.state.credits.coin).toBe(0);
    expect(beginRitualAttempt(granted.state, "coin", hourStart + 3).access)
      .toBe("reward-required");
  });

  it("starts clean when migrating the previous daily state", () => {
    const previousState = { version: 1, date: "2026-08-23" };
    expect(normalizeRitualAccessState(previousState, hourStart))
      .toEqual(createRitualAccessState());
  });
});
