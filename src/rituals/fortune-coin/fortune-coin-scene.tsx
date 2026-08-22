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
  const target = targetFace >= 0.5 ? 180 : 0;
  if (motion <= 0.47) {
    return interpolate(
      motion,
      [0, 0.47],
      [42, target + turns * 360],
      Extrapolation.CLAMP,
    );
  }
  return target + interpolate(
    motion,
    [0.47, 0.56, 0.64, 0.73, 0.82, 0.9, 1],
    [12, -8, 5, -3, 1, 0, 0],
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
    return {
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 0.24, 0.47, 1],
            [0, drift * 0.52, drift, drift * 0.24],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            progress,
            [0, 0.24, 0.47, 0.56, 0.64, 0.73, 0.82, 1],
            [0, -height, 0, -44 * geometry.scale, 0, -19 * geometry.scale, 0, 0],
            Extrapolation.CLAMP,
          ) - charge.value * 7 * geometry.scale,
        },
        {
          scale: interpolate(
            progress,
            [0, 0.24, 0.47, 0.56, 0.73, 1],
            [1, 1.28, 1, 1.06, 1.02, 1],
            Extrapolation.CLAMP,
          ),
        },
        {
          rotateZ: `${interpolate(
            progress,
            [0, 0.24, 0.47, 0.73, 1],
            [0, driftX.value * 0.055, driftX.value * 0.035, -1.4, 0],
            Extrapolation.CLAMP,
          )}deg`,
        },
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
    return {
      opacity: interpolate(
        progress,
        [0, 0.2, 0.47, 0.56, 0.64, 1],
        [0.48, 0.08, 0.54, 0.32, 0.5, 0.46],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 0.47, 1],
            [0, drift, drift * 0.24],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress,
            [0, 0.24, 0.47, 1],
            [1, 0.58, 1.08, 1],
            Extrapolation.CLAMP,
          ),
        },
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
