/**
 * Keep this true while validating the VFX pipeline on a physical Android device.
 * Switching it to false selects the intentionally visible preliminary normal values.
 */
export const VFX_DEBUG = false;

const debugCalibration = {
  sceneDimPeak: 0.5,
  broadGlowIdle: 0.12,
  broadGlowPeak: 0.82,
  coreGlowPeak: 0.95,
  wispySmokeIdle: 0.15,
  wispySmokeTouch: 0.27,
  wispySmokeCharging: 0.6,
  wispySmokePeak: 0.7,
  wispySmokeResult: 0.22,
  candlePeak: 0.48,
  peakPulse: 0.95,
  glassShimmerPeak: 0.58,
  outerSmokePeak: 0.5,
} as const;

const normalCalibration = {
  sceneDimPeak: 0.28,
  broadGlowIdle: 0.05,
  broadGlowPeak: 0.48,
  coreGlowPeak: 0.6,
  wispySmokeIdle: 0.1,
  wispySmokeTouch: 0.18,
  wispySmokeCharging: 0.5,
  wispySmokePeak: 0.62,
  wispySmokeResult: 0.16,
  candlePeak: 0.22,
  peakPulse: 0.46,
  glassShimmerPeak: 0.24,
  outerSmokePeak: 0.2,
} as const;

export const crystalBallVfx = VFX_DEBUG ? debugCalibration : normalCalibration;
