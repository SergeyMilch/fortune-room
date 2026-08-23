import { describe, expect, it } from "vitest";

import { drawCoinOutcome, drawCoinReading } from "./coin-content";
import {
  COIN_EDGE_ROTATION_DEGREES,
  COIN_FIRST_IMPACT_PROGRESS,
  COIN_MOON_SETTLING_ANGLES,
  COIN_SETTLING_PROGRESS,
  COIN_SUN_SETTLING_ANGLES,
  getCoinThrowProfile,
} from "./coin-physics";

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

  it("leaves about two seconds after impact for edge-to-edge settling", () => {
    const profile = getCoinThrowProfile({
      upwardDistance: 0.8,
      upwardVelocity: 1.1,
      horizontalOffset: 0,
    });
    const settlingMs = profile.durationMs * (1 - COIN_FIRST_IMPACT_PROGRESS);

    expect(settlingMs).toBeGreaterThanOrEqual(2100);
    expect(settlingMs).toBeLessThanOrEqual(2300);
  });

  it("rocks across the rim repeatedly before allowing the result to become visible", () => {
    expect(COIN_SETTLING_PROGRESS).toHaveLength(COIN_SUN_SETTLING_ANGLES.length);
    expect(COIN_SETTLING_PROGRESS).toHaveLength(COIN_MOON_SETTLING_ANGLES.length);
    expect(COIN_SUN_SETTLING_ANGLES.slice(0, 8)).toEqual(
      COIN_MOON_SETTLING_ANGLES.slice(0, 8),
    );

    const rimCrossings = COIN_SUN_SETTLING_ANGLES.slice(0, 8).reduce(
      (count, angle, index, angles) =>
        index > 0 && (angles[index - 1] - 90) * (angle - 90) < 0 ? count + 1 : count,
      0,
    );

    expect(rimCrossings).toBe(7);
    expect(COIN_SUN_SETTLING_ANGLES.at(-1)).toBe(0);
    expect(COIN_MOON_SETTLING_ANGLES.at(-1)).toBe(180);
  });

  it("completes one full rim rotation with steadily decreasing angular steps", () => {
    expect(COIN_EDGE_ROTATION_DEGREES).toHaveLength(COIN_SETTLING_PROGRESS.length);
    expect(COIN_EDGE_ROTATION_DEGREES.at(0)).toBe(0);
    expect(COIN_EDGE_ROTATION_DEGREES.at(-1)).toBe(360);

    const steps = COIN_EDGE_ROTATION_DEGREES.slice(1).map(
      (angle, index) => angle - COIN_EDGE_ROTATION_DEGREES[index],
    );
    expect(steps.every((step, index) => index === 0 || step < steps[index - 1])).toBe(true);
  });

  it("keeps readings short and outcome-specific", () => {
    expect(drawCoinReading("sun", () => 0)).toContain("действ");
    expect(drawCoinReading("moon", () => 0)).toContain("лучше");
  });
});
