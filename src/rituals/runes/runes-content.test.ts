import { describe, expect, it } from "vitest";

import { buildRuneReading, drawRuneSpread, runes } from "./runes-content";

describe("Runes content", () => {
  it("contains the 24 unique Elder Futhark runes", () => {
    expect(runes).toHaveLength(24);
    expect(new Set(runes.map((rune) => rune.id)).size).toBe(24);
    expect(new Set(runes.map((rune) => rune.symbol)).size).toBe(24);
  });

  it("draws eight unique stones", () => {
    const spread = drawRuneSpread(() => 0.42);
    expect(spread).toHaveLength(8);
    expect(new Set(spread.map((rune) => rune.id)).size).toBe(8);
  });

  it("builds a three-position reading in order", () => {
    const selected = [runes[10], runes[4], runes[11]];
    const reading = buildRuneReading(selected);
    expect(reading).toContain(selected[0].meanings.hidden);
    expect(reading).toContain(selected[1].meanings.path);
    expect(reading).toContain(selected[2].meanings.outcome);
  });
});
