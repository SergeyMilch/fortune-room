import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import {
  Blur,
  Canvas,
  Circle,
  Group,
  Mask,
  Oval,
  rect,
  rrect,
} from "@shopify/react-native-skia";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

import type { CrystalBallGeometry, SphereLayout } from "./crystal-ball-geometry";
import { crystalBallVfx, VFX_DEBUG } from "./crystal-ball-vfx-config";
import { WispySmokeFlipbook } from "./wispy-smoke-flipbook";

type RitualValues = {
  ritual: SharedValue<number>;
  prediction: SharedValue<number>;
};

type InnerEffectsProps = RitualValues & {
  geometry: CrystalBallGeometry;
  touch: SharedValue<number>;
};

const masks = {
  smokeOuter: require("../../../assets/crystal-ball/layers/smoke-mask-outer.png"),
  candleLight: require("../../../assets/crystal-ball/layers/candle-light-mask.png"),
} as const;

function peakProgress(ritual: number, prediction: number) {
  "worklet";
  return Math.max(0, Math.min(1, (ritual - 0.72) / 0.28)) * (1 - prediction);
}

export function CrystalBallInnerEffects({ geometry, touch, ritual, prediction }: InnerEffectsProps) {
  const { sphere, sphereInner } = geometry;
  const diameter = sphere.diameter;

  const charge = useDerivedValue(() => ritual.value * (1 - prediction.value * 0.48));
  const peak = useDerivedValue(() => peakProgress(ritual.value, prediction.value));
  const broadGlowOpacity = useDerivedValue(() => {
    const touchLift = touch.value * (VFX_DEBUG ? 0.1 : 0.045);
    const range = crystalBallVfx.broadGlowPeak - crystalBallVfx.broadGlowIdle;
    return Math.min(1, crystalBallVfx.broadGlowIdle + range * charge.value + touchLift);
  });
  const coreGlowOpacity = useDerivedValue(() =>
    Math.min(1, crystalBallVfx.coreGlowPeak * charge.value * 0.72 + crystalBallVfx.peakPulse * peak.value * 0.55),
  );
  const peakPulseOpacity = useDerivedValue(() => crystalBallVfx.peakPulse * peak.value);

  const innerClipRect = rect(
    sphereInner.left - sphere.left,
    sphereInner.top - sphere.top,
    sphereInner.width,
    sphereInner.height,
  );
  const innerClip = rrect(
    innerClipRect,
    sphereInner.width / 2,
    sphereInner.height / 2,
  );

  return (
    <Canvas
      pointerEvents="none"
      style={{ position: "absolute", left: sphere.left, top: sphere.top, width: diameter, height: diameter }}
    >
      <Group clip={innerClip}>
        <Circle cx={diameter * 0.5} cy={diameter * 0.53} r={diameter * 0.34} color="#7EC6E0" opacity={broadGlowOpacity}>
          <Blur blur={diameter * (VFX_DEBUG ? 0.065 : 0.075)} />
        </Circle>
        <Circle cx={diameter * 0.52} cy={diameter * 0.52} r={diameter * 0.2} color="#E3F3F4" opacity={coreGlowOpacity}>
          <Blur blur={diameter * 0.05} />
        </Circle>
        <Circle cx={diameter * 0.51} cy={diameter * 0.51} r={diameter * 0.27} color="#D8F1F4" opacity={peakPulseOpacity}>
          <Blur blur={diameter * 0.085} />
        </Circle>
      </Group>
    </Canvas>
  );
}

export function CrystalBallSmokeLayer({
  geometry,
  touch,
  ritual,
  prediction,
}: InnerEffectsProps) {
  const { sphere, sphereInner } = geometry;
  const innerClip = rrect(
    rect(
      sphereInner.left - sphere.left,
      sphereInner.top - sphere.top,
      sphereInner.width,
      sphereInner.height,
    ),
    sphereInner.width / 2,
    sphereInner.height / 2,
  );

  return (
    <Canvas
      pointerEvents="none"
      style={{
        position: "absolute",
        left: sphere.left,
        top: sphere.top,
        width: sphere.diameter,
        height: sphere.diameter,
      }}
    >
      <Group clip={innerClip}>
        <WispySmokeFlipbook
          sphere={sphere}
          touch={touch}
          ritual={ritual}
          prediction={prediction}
        />
      </Group>
    </Canvas>
  );
}

export function CrystalBallCandleResponse({ ritual, prediction }: RitualValues) {
  const style = useAnimatedStyle(() => ({
    opacity: crystalBallVfx.candlePeak * peakProgress(ritual.value, prediction.value),
    transform: [{ scale: 1 + peakProgress(ritual.value, prediction.value) * (VFX_DEBUG ? 0.025 : 0.012) }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Image source={masks.candleLight} contentFit="contain" contentPosition="center" tintColor="#F0A13D" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export function CrystalBallGlassShimmer({ sphere, prediction }: { sphere: SphereLayout; prediction: SharedValue<number> }) {
  const diameter = sphere.diameter;
  const shimmerX = useDerivedValue(() =>
    diameter * interpolate(prediction.value, [0, 0.82, 1], [-0.38, 1.06, 1.06]),
  );
  const shimmerOpacity = useDerivedValue(() =>
    interpolate(
      prediction.value,
      [0, 0.08, 0.38, 0.78, 1],
      [0, 0.06, crystalBallVfx.glassShimmerPeak, 0.1, 0],
    ),
  );

  return (
    <Canvas
      pointerEvents="none"
      style={{ position: "absolute", left: sphere.left, top: sphere.top, width: diameter, height: diameter }}
    >
      <Mask mode="alpha" mask={<Circle cx={diameter / 2} cy={diameter / 2} r={diameter * 0.47} color="white" />}>
        <Oval x={shimmerX} y={diameter * 0.04} width={diameter * 0.22} height={diameter * 0.9} color="#E8F5F5" opacity={shimmerOpacity}>
          <Blur blur={diameter * 0.04} />
        </Oval>
      </Mask>
    </Canvas>
  );
}

export function CrystalBallFrontSmoke({ ritual, prediction }: RitualValues) {
  const style = useAnimatedStyle(() => {
    const activity = ritual.value * (1 - prediction.value * 0.62);
    return {
      opacity: interpolate(activity, [0, 0.35, 1], [VFX_DEBUG ? 0.06 : 0.025, crystalBallVfx.outerSmokePeak * 0.45, crystalBallVfx.outerSmokePeak]),
      transform: [
        { translateX: interpolate(activity, [0, 1], [VFX_DEBUG ? -12 : -5, VFX_DEBUG ? 16 : 7]) },
        { translateY: interpolate(activity, [0, 1], [VFX_DEBUG ? 12 : 5, VFX_DEBUG ? -16 : -7]) },
        { scale: interpolate(activity, [0, 1], [0.99, VFX_DEBUG ? 1.045 : 1.02]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Image source={masks.smokeOuter} contentFit="contain" contentPosition="center" tintColor="#B4D0D4" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
