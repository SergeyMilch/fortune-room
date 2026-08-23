import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { palette } from "@/theme/palette";
import { RewardedAccessModal } from "@/ads/rewarded-access-modal";
import { useRitualRewardedAccess } from "@/ads/use-ritual-rewarded-access";

import { getFortuneCoinGeometry } from "./fortune-coin-geometry";
import { FortuneCoinScene } from "./fortune-coin-scene";
import { useFortuneCoinRitual } from "./use-fortune-coin-ritual";

export function FortuneCoinScreen() {
  const { width, height } = useWindowDimensions();
  const geometry = useMemo(() => getFortuneCoinGeometry(width, height), [height, width]);
  const ritual = useFortuneCoinRitual();
  const access = useRitualRewardedAccess("coin");
  const gestureAuthorizedRef = useRef(false);

  useEffect(() => {
    if (ritual.phase === "completed") access.recordResult();
  }, [access.recordResult, ritual.phase]);

  const flickGesture = useMemo(
    () => Gesture.Pan()
      .minDistance(0)
      .maxPointers(1)
      .runOnJS(true)
      .shouldCancelWhenOutside(false)
      .onBegin(() => {
        gestureAuthorizedRef.current = access.beginAttempt(ritual.beginTouch, false);
      })
      .onEnd((event) => {
        if (!gestureAuthorizedRef.current) return;
        ritual.releaseCoin({
          upwardDistance: Math.max(0, -event.translationY) / Math.max(1, 150 * geometry.scale),
          upwardVelocity: Math.max(0, -event.velocityY) / Math.max(1, 1100 * geometry.scale),
          horizontalOffset: (event.translationX + event.velocityX * 0.045) / Math.max(0.1, geometry.scale),
        });
      })
      .onFinalize(() => {
        gestureAuthorizedRef.current = false;
      }),
    [access.beginAttempt, geometry.scale, ritual.beginTouch, ritual.releaseCoin],
  );

  const instruction =
    ritual.phase === "idle"
      ? "Задай вопрос мысленно"
      : ritual.phase === "touch" || ritual.phase === "charge"
        ? ritual.charged ? "Подбрось монету" : "Почувствуй её вес"
        : ritual.phase === "airborne"
          ? "Монета решает"
          : ritual.phase === "bouncing"
            ? "Слушай, как она падает"
            : ritual.phase === "settling"
              ? "Ещё мгновение"
              : "Ответ монеты";

  const gestureEnabled = ritual.phase === "idle" || ritual.phase === "touch" || ritual.phase === "charge";
  const resultVisible = ritual.phase === "reveal" || ritual.phase === "completed";

  return (
    <View style={styles.screen}>
      <FortuneCoinScene
        geometry={geometry}
        charge={ritual.charge}
        motion={ritual.motion}
        reveal={ritual.reveal}
        throwHeight={ritual.throwHeight}
        turns={ritual.turns}
        driftX={ritual.driftX}
        targetFace={ritual.targetFace}
      />

      {gestureEnabled ? (
        <GestureDetector gesture={flickGesture}>
          <View
            collapsable={false}
            accessibilityLabel="Монета судьбы"
            accessibilityHint="Удерживайте монету, затем проведите вверх"
            style={[styles.gestureArea, geometry.gesture]}
          />
        </GestureDetector>
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View pointerEvents="none" style={styles.topContent}>
          <Text selectable style={styles.instruction}>{instruction}</Text>
          {resultVisible && ritual.outcome ? (
            <Animated.View
              entering={FadeIn.duration(480)}
              exiting={FadeOut.duration(180)}
              style={styles.resultCard}
            >
              <Text style={styles.resultSymbol}>{ritual.outcome === "sun" ? "☀" : "☾"}</Text>
              <Text style={styles.resultName}>{ritual.outcome === "sun" ? "СОЛНЦЕ" : "ЛУНА"}</Text>
              <Text style={styles.resultAnswer}>{ritual.outcome === "sun" ? "ДА" : "НЕТ"}</Text>
              <View style={styles.divider} />
              <Text selectable style={styles.resultReading}>{ritual.reading}</Text>
            </Animated.View>
          ) : null}
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          {ritual.phase === "idle" ? (
            <Text style={styles.footerHint}>УДЕРЖИВАЙ МОНЕТУ</Text>
          ) : null}
          {(ritual.phase === "touch" || ritual.phase === "charge") ? (
            <Text style={styles.footerHint}>
              {ritual.charged ? "ПРОВЕДИ ВВЕРХ" : "НЕ ОТПУСКАЙ"}
            </Text>
          ) : null}
          {ritual.phase === "completed" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Подбросить снова"
              onPress={() => access.beginAttempt(ritual.resetRitual)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>ПОДБРОСИТЬ СНОВА</Text>
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
    paddingHorizontal: 18,
  },
  topContent: { alignItems: "center", paddingTop: 18, gap: 14 },
  instruction: {
    color: "rgba(238,223,198,0.94)",
    fontSize: 19,
    lineHeight: 26,
    fontFamily: "serif",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 10,
  },
  resultCard: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.38)",
    backgroundColor: "rgba(4,7,9,0.86)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.42)",
  },
  resultSymbol: { color: "#D59A50", fontSize: 31, lineHeight: 38 },
  resultName: {
    color: "rgba(221,170,102,0.96)",
    fontSize: 13,
    letterSpacing: 2.5,
    fontWeight: "600",
  },
  resultAnswer: {
    color: "rgba(244,229,202,0.98)",
    fontSize: 28,
    lineHeight: 36,
    fontFamily: "serif",
  },
  divider: {
    width: 56,
    height: 1,
    marginVertical: 7,
    backgroundColor: "rgba(199,146,74,0.35)",
  },
  resultReading: {
    color: "rgba(235,218,188,0.85)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "serif",
    textAlign: "center",
  },
  footer: { minHeight: 76, alignItems: "center", justifyContent: "center", paddingBottom: 12 },
  footerHint: {
    color: "rgba(234,219,193,0.76)",
    fontSize: 9,
    letterSpacing: 2.1,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 8,
  },
  actionButton: {
    minWidth: 214,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.38)",
    backgroundColor: "rgba(6,8,9,0.86)",
  },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionText: {
    color: "rgba(239,225,200,0.94)",
    fontSize: 11,
    letterSpacing: 1.7,
    fontWeight: "600",
  },
});
