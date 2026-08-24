import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { HomeGeometry, HomeItemId } from "./fortune-room-home-geometry";
import { HomeCandleFlameFlipbook } from "./home-candle-flame-flipbook";

const homeScene = require("../../assets/home/fortune-room-home-no-flames.png");

const dust = [
  { x: 0.18, y: 0.28, size: 1.4, delay: 0, duration: 7600 },
  { x: 0.72, y: 0.23, size: 1.1, delay: 1800, duration: 9100 },
  { x: 0.57, y: 0.48, size: 1.2, delay: 900, duration: 8200 },
  { x: 0.31, y: 0.56, size: 1, delay: 2700, duration: 9800 },
  { x: 0.82, y: 0.62, size: 1.3, delay: 3400, duration: 8700 },
] as const;

function DustParticle({
  x,
  y,
  size,
  delay,
  duration,
}: (typeof dust)[number]) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * 0.22,
    transform: [
      { translateY: -18 * progress.value },
      { translateX: 7 * Math.sin(progress.value * Math.PI) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.dust,
        { left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size },
        style,
      ]}
    />
  );
}

function CandleBreathing({ geometry }: { geometry: HomeGeometry }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.025 + glow.value * 0.035 }));
  const anchors = [
    { x: 177, y: 793, size: 245 },
    { x: 804, y: 870, size: 220 },
  ] as const;

  return (
    <>
      {anchors.map((anchor) => {
        const size = anchor.size * geometry.scale;
        return (
          <Animated.View
            key={anchor.x}
            style={[
              styles.candleGlow,
              {
                left: geometry.artwork.left + anchor.x * geometry.scale - size / 2,
                top: geometry.artwork.top + anchor.y * geometry.scale - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
              },
              glowStyle,
            ]}
          />
        );
      })}
    </>
  );
}

export function FortuneRoomHomeScene({
  geometry,
  focusedItem,
}: {
  geometry: HomeGeometry;
  focusedItem: HomeItemId | null;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={homeScene}
        contentFit="fill"
        transition={0}
        style={[styles.artwork, geometry.artwork]}
      />
      <CandleBreathing geometry={geometry} />
      {dust.map((particle) => <DustParticle key={`${particle.x}-${particle.y}`} {...particle} />)}
      {focusedItem ? (
        <Animated.View
          key={focusedItem}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(240)}
          style={StyleSheet.absoluteFill}
        >
          <View
            style={[
              styles.sceneDim,
              {
                backgroundColor:
                  focusedItem === "crystalBall"
                    ? "rgba(1,3,4,0.13)"
                    : "rgba(1,3,4,0.07)",
              },
            ]}
          />
        </Animated.View>
      ) : null}
      <HomeCandleFlameFlipbook geometry={geometry} />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: { position: "absolute" },
  candleGlow: {
    position: "absolute",
    backgroundColor: "#E6A85D",
  },
  dust: {
    position: "absolute",
    borderRadius: 2,
    backgroundColor: "#F2DFC0",
    shadowColor: "#EFC88E",
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  sceneDim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
