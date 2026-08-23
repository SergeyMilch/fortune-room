import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

import { FortuneCoinCandleFlame } from "./fortune-coin-candle-flame";
import type { FortuneCoinGeometry } from "./fortune-coin-geometry";
import {
  COIN_EDGE_ROTATION_DEGREES,
  COIN_FIRST_IMPACT_PROGRESS,
  COIN_MOON_SETTLING_ANGLES,
  COIN_SETTLING_PROGRESS,
  COIN_SUN_SETTLING_ANGLES,
} from "./coin-physics";

const assets = {
  background: require("../../../assets/fortune-coin/runtime/coin-scene-no-flame.png"),
  sun: require("../../../assets/fortune-coin/runtime/coin-sun.png"),
  moon: require("../../../assets/fortune-coin/runtime/coin-moon.png"),
  edge: require("../../../assets/fortune-coin/runtime/coin-edge.png"),
} as const;

function getCoinAngle(
  motion: number,
  charge: number,
  turns: number,
  targetFace: number,
) {
  "worklet";
  if (motion <= 0) return 58 - charge * 16;
  if (motion <= COIN_FIRST_IMPACT_PROGRESS) {
    return interpolate(
      motion,
      [0, COIN_FIRST_IMPACT_PROGRESS],
      [42, turns * 360 + COIN_SUN_SETTLING_ANGLES[0]],
      Extrapolation.CLAMP,
    );
  }

  return interpolate(
    motion,
    COIN_SETTLING_PROGRESS,
    targetFace >= 0.5 ? COIN_MOON_SETTLING_ANGLES : COIN_SUN_SETTLING_ANGLES,
    Extrapolation.CLAMP,
  );
}

function getCoinEdgeRotation(motion: number, driftX: number) {
  "worklet";
  if (motion <= COIN_FIRST_IMPACT_PROGRESS) {
    return interpolate(
      motion,
      [0, 0.22, COIN_FIRST_IMPACT_PROGRESS],
      [0, driftX * 0.055, 0],
      Extrapolation.CLAMP,
    );
  }

  const direction = driftX < 0 ? -1 : 1;
  return direction * interpolate(
    motion,
    COIN_SETTLING_PROGRESS,
    COIN_EDGE_ROTATION_DEGREES,
    Extrapolation.CLAMP,
  );
}

export function FortuneCoinScene({
  geometry,
  charge,
  motion,
  reveal,
  throwHeight,
  turns,
  driftX,
  targetFace,
}: {
  geometry: FortuneCoinGeometry;
  charge: SharedValue<number>;
  motion: SharedValue<number>;
  reveal: SharedValue<number>;
  throwHeight: SharedValue<number>;
  turns: SharedValue<number>;
  driftX: SharedValue<number>;
  targetFace: SharedValue<number>;
}) {
  const angle = useDerivedValue(() => getCoinAngle(
    motion.value,
    charge.value,
    turns.value,
    targetFace.value,
  ));

  const motionStyle = useAnimatedStyle(() => {
    const progress = motion.value;
    const height = throwHeight.value * geometry.scale;
    const drift = driftX.value * geometry.scale;
    const edgeRotation = getCoinEdgeRotation(progress, driftX.value);
    return {
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 0.22, 0.4, 1],
            [0, drift * 0.52, drift, drift * 0.24],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            progress,
            [
              0, 0.22, 0.4, 0.422, 0.445, 0.469, 0.493, 0.519, 0.545,
              0.572, 0.6, 0.63, 0.66, 0.69, 0.72, 0.75, 0.78, 1,
            ],
            [
              0, -height, 0, -25 * geometry.scale, 0, -15 * geometry.scale, 0,
              -9 * geometry.scale, 0, -5.5 * geometry.scale, 0, -3 * geometry.scale,
              0, -1.7 * geometry.scale, 0, -0.9 * geometry.scale, 0, 0,
            ],
            Extrapolation.CLAMP,
          ) - charge.value * 7 * geometry.scale,
        },
        {
          scale: interpolate(
            progress,
            [0, 0.22, 0.4, 0.445, 0.493, 0.545, 0.6, 0.66, 0.72, 0.78, 1],
            [1, 1.28, 1, 1.035, 1.026, 1.019, 1.014, 1.01, 1.006, 1.003, 1],
            Extrapolation.CLAMP,
          ),
        },
        { rotateZ: `${edgeRotation}deg` },
      ],
    };
  });

  const sunFaceStyle = useAnimatedStyle(() => {
    const facesForward = Math.cos((angle.value * Math.PI) / 180) >= 0;
    return {
      opacity: facesForward ? 1 : 0,
      transform: [{ perspective: 760 }, { rotateX: `${angle.value}deg` }],
    };
  });

  const moonFaceStyle = useAnimatedStyle(() => {
    const facesForward = Math.cos((angle.value * Math.PI) / 180) < 0;
    return {
      opacity: facesForward ? 1 : 0,
      transform: [
        { perspective: 760 },
        { rotateX: `${angle.value + 180}deg` },
      ],
    };
  });

  const edgeStyle = useAnimatedStyle(() => {
    const faceAmount = Math.abs(Math.cos((angle.value * Math.PI) / 180));
    return {
      opacity: Math.pow(1 - faceAmount, 3) * 0.96,
      transform: [{ scaleX: 0.98 + (1 - faceAmount) * 0.05 }],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const progress = motion.value;
    const drift = driftX.value * geometry.scale;
    const edgeRotation = getCoinEdgeRotation(progress, driftX.value);
    return {
      opacity: interpolate(
        progress,
        [0, 0.18, 0.4, 0.445, 0.493, 0.545, 0.6, 0.66, 0.72, 0.78, 1],
        [0.48, 0.08, 0.58, 0.4, 0.54, 0.43, 0.51, 0.45, 0.49, 0.46, 0.46],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 0.4, 1],
            [0, drift, drift * 0.24],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress,
            [0, 0.22, 0.4, 0.445, 0.493, 0.545, 0.6, 0.66, 0.72, 0.78, 1],
            [1, 0.58, 1.1, 0.9, 1.06, 0.94, 1.035, 0.97, 1.018, 0.99, 1],
            Extrapolation.CLAMP,
          ),
        },
        { rotateZ: `${edgeRotation}deg` },
      ],
    };
  });

  const dimStyle = useAnimatedStyle(() => ({ opacity: reveal.value * 0.28 }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={assets.background}
        contentFit="fill"
        transition={0}
        style={[styles.absolute, geometry.artwork]}
      />
      <FortuneCoinCandleFlame geometry={geometry} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
      <Animated.View
        style={[
          styles.shadow,
          {
            left: geometry.coin.left + geometry.coin.width * 0.08,
            top: geometry.coin.top + geometry.coin.height * 0.68,
            width: geometry.coin.width * 0.84,
            height: geometry.coin.height * 0.16,
          },
          shadowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.absolute,
          geometry.coin,
          motionStyle,
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, sunFaceStyle]}>
          <Image source={assets.sun} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, moonFaceStyle]}>
          <Image source={assets.moon} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.edge, edgeStyle]}>
          <Image source={assets.edge} contentFit="fill" transition={0} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: "absolute" },
  dim: { backgroundColor: "#010304" },
  edge: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "39%",
    height: "22%",
  },
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.72)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.72)",
  },
});
