import { describe, expect, it } from "vitest";

import { drawCoinOutcome, drawCoinReading } from "./coin-content";
import { getCoinThrowProfile } from "./coin-physics";

describe("fortune coin", () => {
  it("uses an exact 50/50 boundary without coupling it to flick strength", () => {
    expect(drawCoinOutcome(() => 0)).toBe("sun");
    expect(drawCoinOutcome(() => 0.499999)).toBe("sun");
    expect(drawCoinOutcome(() => 0.5)).toBe("moon");
    expect(drawCoinOutcome(() => 0.999999)).toBe("moon");
  });

  it("makes a stronger flick higher and faster-spinning", () => {
    const weak = getCoinThrowProfile({
      upwardDistance: 0.3,
      upwardVelocity: 0.72,
      horizontalOffset: 0,
    });
    const strong = getCoinThrowProfile({
      upwardDistance: 1.4,
      upwardVelocity: 1.8,
      horizontalOffset: 0,
    });

    expect(weak.valid).toBe(true);
    expect(strong.throwHeight).toBeGreaterThan(weak.throwHeight);
    expect(strong.turns).toBeGreaterThan(weak.turns);
  });

  it("keeps readings short and outcome-specific", () => {
    expect(drawCoinReading("sun", () => 0)).toContain("действ");
    expect(drawCoinReading("moon", () => 0)).toContain("лучше");
  });
});

