export type CoinFlickInput = {
  upwardDistance: number;
  upwardVelocity: number;
  horizontalOffset: number;
};

export type CoinThrowProfile = {
  valid: boolean;
  strength: number;
  throwHeight: number;
  turns: number;
  driftX: number;
  durationMs: number;
};

export const COIN_FIRST_IMPACT_PROGRESS = 0.4;

export const COIN_SETTLING_PROGRESS = [
  0.4, 0.445, 0.493, 0.545, 0.6, 0.66, 0.72, 0.78, 0.835, 0.88, 0.925, 0.965, 1,
];

// One full turn around the rim with a steadily decreasing angular step.
export const COIN_EDGE_ROTATION_DEGREES = [
  0, 76, 140, 194, 239, 276, 306, 329, 344, 353, 357, 359, 360,
];

// The shared opening keeps the result unreadable while the coin rocks around its rim.
// Only the last five points let it fall toward the selected face.
export const COIN_SUN_SETTLING_ANGLES = [
  78, 104, 81, 101, 83, 98, 86, 94, 70, 48, 27, 11, 0,
];

export const COIN_MOON_SETTLING_ANGLES = [
  78, 104, 81, 101, 83, 98, 86, 94, 112, 135, 153, 169, 180,
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getCoinThrowProfile(input: CoinFlickInput): CoinThrowProfile {
  const distance = Math.max(0, input.upwardDistance);
  const velocity = Math.max(0, input.upwardVelocity);
  const valid = distance >= 0.28 || velocity >= 0.7;
  const rawStrength = Math.max(distance, velocity * 0.72);
  const strength = clamp(rawStrength / 1.5, 0, 1);

  return {
    valid,
    strength,
    throwHeight: 290 + strength * 190,
    turns: Math.round(3 + strength * 6),
    driftX: clamp(input.horizontalOffset, -105, 105),
    durationMs: Math.round(3500 + strength * 220),
  };
}
