import { useEffect } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { RuneDefinition } from "./runes-content";
import { RuneSymbol } from "./rune-symbol";
import { RunesCandleFlame } from "./runes-candle-flame";
import type { RunesGeometry } from "./runes-geometry";
import type { RunesPhase } from "./use-runes-ritual";

const assets = {
  background: require("../../../assets/runes/runtime/scene-background-no-flame.png"),
  pouch: require("../../../assets/runes/runtime/rune-pouch.png"),
  stone: require("../../../assets/runes/runtime/rune-stone.png"),
} as const;

const rotations = [-17, 11, -8, 19, -13, 8, -21, 15] as const;
const delays = [20, 100, 170, 250, 330, 410, 500, 590] as const;

function RuneStoneSprite({
  index,
  rune,
  geometry,
  phase,
  selectedOrder,
  selectedCount,
  castProgress,
  onSelect,
}: {
  index: number;
  rune: RuneDefinition;
  geometry: RunesGeometry;
  phase: RunesPhase;
  selectedOrder: number;
  selectedCount: number;
  castProgress: SharedValue<number>;
  onSelect: (index: number) => void;
}) {
  const rect = geometry.stones[index];
  const slot = selectedOrder >= 0 ? geometry.selectedSlots[selectedOrder] : rect;
  const selectionProgress = useSharedValue(selectedOrder >= 0 ? 1 : 0);
  const arrangementProgress = useSharedValue(
    selectedOrder >= 0 && (phase === "arranging" || phase === "completed") ? 1 : 0,
  );
  const dimProgress = useSharedValue(selectedCount === 3 && selectedOrder < 0 ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(selectedOrder >= 0 ? 1 : 0, {
      duration: selectedOrder >= 0 ? 620 : 220,
      easing: Easing.bezier(0.2, 0.74, 0.2, 1),
    });
  }, [selectedOrder, selectionProgress]);

  useEffect(() => {
    const shouldArrange = selectedOrder >= 0 && (phase === "arranging" || phase === "completed");
    arrangementProgress.value = withTiming(shouldArrange ? 1 : 0, {
      duration: shouldArrange ? 820 : 220,
      easing: Easing.bezier(0.2, 0.74, 0.2, 1),
    });
  }, [arrangementProgress, phase, selectedOrder]);

  useEffect(() => {
    dimProgress.value = withTiming(selectedCount === 3 && selectedOrder < 0 ? 1 : 0, {
      duration: 520,
    });
  }, [dimProgress, selectedCount, selectedOrder]);

  const stoneStyle = useAnimatedStyle(() => {
    const cast = castProgress.value;
    const delayedCast = Math.max(0, Math.min(1, (cast * 1000 - delays[index]) / 410));
    const sourceCenterX = geometry.pouch.left + geometry.pouch.width * 0.58;
    const sourceCenterY = geometry.pouch.top + geometry.pouch.height * 0.72;
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;
    const startX = sourceCenterX - targetCenterX;
    const startY = sourceCenterY - targetCenterY;
    const arc = Math.sin(delayedCast * Math.PI) * 118 * geometry.scale;
    const arrangement = arrangementProgress.value;
    const targetScale = slot.width / rect.width;
    const flipX = interpolate(arrangement, [0, 0.42, 0.52, 1], [1, 0.08, 0.08, 1]);

    return {
      opacity: interpolate(delayedCast, [0, 0.08, 1], [0, 1, 1]) * (1 - dimProgress.value * 0.72),
      transform: [
        {
          translateX:
            interpolate(delayedCast, [0, 1], [startX, 0]) +
            (slot.left - rect.left) * arrangement,
        },
        {
          translateY:
            interpolate(delayedCast, [0, 1], [startY, 0]) - arc +
            (slot.top - rect.top) * arrangement,
        },
        { rotateZ: `${rotations[index] * (1 - arrangement)}deg` },
        { scale: interpolate(arrangement, [0, 1], [1, targetScale]) * (1 - dimProgress.value * 0.13) },
        { scaleX: flipX },
      ],
    };
  });

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(selectionProgress.value, [0, 0.54, 0.72, 1], [0, 0, 0.76, 1]),
  }));

  const canSelect = phase === "scattered" || phase === "selecting";

  return (
    <Animated.View
      style={[
        styles.stone,
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        stoneStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedOrder >= 0 ? `Выбрана руна ${rune.name}` : "Закрытый рунный камень"}
        disabled={!canSelect || selectedOrder >= 0}
        onPress={() => onSelect(index)}
        style={StyleSheet.absoluteFill}
      >
        {selectedOrder >= 0 ? (
          <Animated.View pointerEvents="none" style={[styles.selectionGlow, revealStyle]} />
        ) : null}
        <Image source={assets.stone} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
        {selectedOrder >= 0 ? (
          <Animated.View pointerEvents="none" style={[styles.runeFace, revealStyle]}>
            <RuneSymbol
              runeId={rune.id}
              width={Math.max(15, rect.width * 0.23)}
              height={Math.max(20, rect.height * 0.33)}
            />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.runeName, { fontSize: Math.max(7, 9 * geometry.scale) }]}
            >
              {rune.name.toUpperCase()}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function RunesScene({
  geometry,
  phase,
  spread,
  selectedIndexes,
  mixProgress,
  castProgress,
  onSelectStone,
}: {
  geometry: RunesGeometry;
  phase: RunesPhase;
  spread: readonly RuneDefinition[];
  selectedIndexes: readonly number[];
  mixProgress: SharedValue<number>;
  castProgress: SharedValue<number>;
  onSelectStone: (index: number) => void;
}) {
  const pouchStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(mixProgress.value * Math.PI * 8) * 13 * geometry.scale },
      { translateY: -Math.sin(mixProgress.value * Math.PI * 4) * 4 * geometry.scale },
      { rotateZ: `${Math.sin(mixProgress.value * Math.PI * 7) * 3.2}deg` },
      { scale: 1 + Math.sin(mixProgress.value * Math.PI) * 0.025 },
    ],
  }));
  const stonesVisible = phase === "casting" || phase === "scattered" || phase === "selecting" || phase === "arranging" || phase === "completed";

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={assets.background}
        contentFit="fill"
        transition={0}
        style={[styles.background, geometry.artwork]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.pouch, geometry.pouch, pouchStyle]}
      >
        <Image source={assets.pouch} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {stonesVisible ? spread.map((rune, index) => (
        <RuneStoneSprite
          key={`${rune.id}-${index}`}
          index={index}
          rune={rune}
          geometry={geometry}
          phase={phase}
          selectedOrder={selectedIndexes.indexOf(index)}
          selectedCount={selectedIndexes.length}
          castProgress={castProgress}
          onSelect={onSelectStone}
        />
      )) : null}
      <RunesCandleFlame geometry={geometry} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { position: "absolute" },
  pouch: { position: "absolute" },
  stone: { position: "absolute" },
  selectionGlow: {
    position: "absolute",
    top: "12%",
    right: "10%",
    bottom: "14%",
    left: "10%",
    borderRadius: 999,
    backgroundColor: "rgba(202,137,61,0.16)",
    boxShadow: "0 0 12px rgba(221,153,69,0.58)",
  },
  runeFace: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  runeName: {
    position: "absolute",
    top: "84%",
    color: "rgba(232,210,175,0.88)",
    letterSpacing: 1.2,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowRadius: 5,
  },
});
