import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { palette } from "@/theme/palette";
import { RewardedAccessModal } from "@/ads/rewarded-access-modal";
import { useRitualRewardedAccess } from "@/ads/use-ritual-rewarded-access";

import { buildRuneReading } from "./runes-content";
import { getRunesGeometry } from "./runes-geometry";
import { RunesScene } from "./runes-scene";
import { useRunesRitual } from "./use-runes-ritual";

export function RunesScreen() {
  const { width, height } = useWindowDimensions();
  const geometry = useMemo(() => getRunesGeometry(width, height), [height, width]);
  const ritual = useRunesRitual();
  const access = useRitualRewardedAccess("runes");
  const mixAuthorizedRef = useRef(false);
  const castAuthorizedRef = useRef(false);
  const selectedRunes = ritual.selectedIndexes.map((index) => ritual.spread[index]);
  const reading = buildRuneReading(selectedRunes);

  useEffect(() => {
    if (ritual.phase === "completed") access.recordResult();
  }, [access.recordResult, ritual.phase]);

  const mixGesture = useMemo(
    () => Gesture.Pan()
      .minDistance(4)
      .runOnJS(true)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        mixAuthorizedRef.current = access.beginAttempt(ritual.beginMix, false);
      })
      .onUpdate((event) => {
        if (!mixAuthorizedRef.current) return;
        const distance = Math.hypot(event.translationX, event.translationY);
        ritual.updateMix(distance / Math.max(1, 145 * geometry.scale));
      })
      .onFinalize(() => {
        if (mixAuthorizedRef.current) ritual.endMix();
        mixAuthorizedRef.current = false;
      }),
    [access.beginAttempt, geometry.scale, ritual.beginMix, ritual.endMix, ritual.updateMix],
  );

  const castGesture = useMemo(
    () => Gesture.Pan()
      .maxPointers(1)
      .minDistance(8)
      .runOnJS(true)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        castAuthorizedRef.current = access.beginAttempt(ritual.beginCast, false);
      })
      .onUpdate((event) => {
        if (!castAuthorizedRef.current) return;
        ritual.updateCast(Math.max(0, -event.translationY) / Math.max(1, 150 * geometry.scale));
      })
      .onFinalize(() => {
        if (castAuthorizedRef.current) ritual.endCast();
        castAuthorizedRef.current = false;
      }),
    [access.beginAttempt, geometry.scale, ritual.beginCast, ritual.endCast, ritual.updateCast],
  );

  const instruction =
    ritual.phase === "idle" || ritual.phase === "mixing"
      ? "Перемешай руны"
      : ritual.phase === "ready-to-cast"
        ? "Проведи вверх"
        : ritual.phase === "casting"
          ? "Слушай, как ложатся камни"
          : ritual.phase === "scattered" || ritual.phase === "selecting"
            ? "Выбери три руны"
            : ritual.phase === "arranging"
              ? "Следи за знаками"
              : "Послание рун";

  const mixingEnabled = ritual.phase === "idle" || ritual.phase === "mixing";
  const castEnabled = ritual.phase === "ready-to-cast";

  return (
    <View style={styles.screen}>
      <RunesScene
        geometry={geometry}
        phase={ritual.phase}
        spread={ritual.spread}
        selectedIndexes={ritual.selectedIndexes}
        mixProgress={ritual.mixProgress}
        castProgress={ritual.castProgress}
        onSelectStone={ritual.selectStone}
      />

      {mixingEnabled ? (
        <GestureDetector gesture={mixGesture}>
          <View
            collapsable={false}
            accessibilityLabel="Перемешать руны в мешочке"
            accessibilityHint="Проведите пальцем по мешочку."
            style={[styles.gestureArea, geometry.pouchGesture]}
          />
        </GestureDetector>
      ) : null}

      {castEnabled ? (
        <GestureDetector gesture={castGesture}>
          <View
            collapsable={false}
            accessibilityLabel="Бросить руны"
            accessibilityHint="Проведите пальцем вверх."
            style={[styles.gestureArea, geometry.castGesture]}
          />
        </GestureDetector>
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View pointerEvents="none" style={styles.topContent}>
          <Text selectable style={styles.instruction}>{instruction}</Text>
          {ritual.phase === "completed" ? (
            <Animated.View
              entering={FadeIn.duration(520)}
              exiting={FadeOut.duration(180)}
              style={[
                styles.readingCard,
                { height: Math.min(height * 0.42, 480) },
              ]}
            >
              <View style={styles.readingRunes}>
                {selectedRunes.map((rune, index) => (
                  <View key={rune.id} style={styles.readingRune}>
                    <Text style={styles.readingPosition}>{["СКРЫТОЕ", "ПУТЬ", "ИСХОД"][index]}</Text>
                    <Text style={styles.readingName}>{rune.name}</Text>
                    <Text style={styles.readingKeywords}>{rune.keywords.join(" · ")}</Text>
                  </View>
                ))}
              </View>
              <Text selectable style={styles.readingText}>{reading}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          {mixingEnabled ? <Text style={styles.footerHint}>ВОДИ ПАЛЬЦЕМ ПО МЕШОЧКУ</Text> : null}
          {castEnabled ? <Text style={styles.footerHint}>ПРОВЕДИ ВВЕРХ</Text> : null}
          {ritual.phase === "scattered" || ritual.phase === "selecting" ? (
            <Text style={styles.footerHint}>ВЫБРАНО {ritual.selectedIndexes.length} ИЗ 3</Text>
          ) : null}
          {ritual.phase === "completed" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Новый расклад"
              onPress={() => access.beginAttempt(ritual.resetRitual)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>НОВЫЙ РАСКЛАД</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
      <RewardedAccessModal {...access.prompt} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: palette.ink },
  gestureArea: { position: "absolute" },
  safeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topContent: { alignItems: "center", paddingTop: 18, gap: 12 },
  instruction: {
    color: "rgba(235,220,194,0.94)",
    fontSize: 19,
    lineHeight: 26,
    fontFamily: "serif",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 10,
  },
  readingCard: {
    width: "100%",
    maxWidth: 510,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(190,134,66,0.34)",
    backgroundColor: "rgba(5,7,8,0.82)",
  },
  readingRunes: { flexDirection: "row", gap: 10 },
  readingRune: { flex: 1, alignItems: "center", gap: 4 },
  readingPosition: {
    color: "rgba(196,139,68,0.92)",
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  readingName: { color: "rgba(240,224,198,0.95)", fontSize: 15, fontFamily: "serif" },
  readingKeywords: {
    color: "rgba(224,204,174,0.68)",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  readingText: {
    color: "rgba(235,219,192,0.88)",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: "serif",
  },
  footer: { minHeight: 72, alignItems: "center", justifyContent: "center", paddingBottom: 12 },
  footerHint: {
    color: "rgba(234,219,193,0.74)",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 8,
  },
  actionButton: {
    minWidth: 190,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.36)",
    backgroundColor: "rgba(7,9,10,0.84)",
  },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionText: {
    color: "rgba(239,225,200,0.94)",
    fontSize: 11,
    letterSpacing: 1.7,
    fontWeight: "600",
  },
});
