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
    durationMs: Math.round(2860 + strength * 260),
  };
}

