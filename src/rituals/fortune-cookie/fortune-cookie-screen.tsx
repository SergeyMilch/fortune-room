import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { audioService } from "@/services/audio-service";
import { palette } from "@/theme/palette";

import { getFortuneCookieGeometry } from "./fortune-cookie-geometry";
import { FortuneCookieScene } from "./fortune-cookie-scene";
import { useFortuneCookieRitual } from "./use-fortune-cookie-ritual";

export function FortuneCookieScreen() {
  const { width, height } = useWindowDimensions();
  const geometry = useMemo(() => getFortuneCookieGeometry(width, height), [height, width]);
  const ritual = useFortuneCookieRitual();

  useEffect(() => {
    void audioService.activateFortuneCookieContext();
    return () => audioService.deactivateFortuneCookieContext();
  }, []);

  const breakGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .shouldCancelWhenOutside(false)
      .onStart(ritual.beginBreaking)
      .onUpdate((event) => ritual.updateBreaking((event.scale - 1) / 0.28))
      .onEnd(ritual.endBreaking);

    const oneFingerFallback = Gesture.Pan()
      .maxPointers(1)
      .minDistance(10)
      .runOnJS(true)
      .shouldCancelWhenOutside(false)
      .onStart(ritual.beginBreaking)
      .onUpdate((event) => {
        ritual.updateBreaking(Math.abs(event.translationX) / Math.max(1, 72 * geometry.scale));
      })
      .onEnd(ritual.endBreaking);

    return Gesture.Simultaneous(pinch, oneFingerFallback);
  }, [geometry.scale, ritual.beginBreaking, ritual.endBreaking, ritual.updateBreaking]);

  const paperGesture = useMemo(
    () => Gesture.Pan()
      .maxPointers(1)
      .minDistance(8)
      .runOnJS(true)
      .onBegin(ritual.beginPaperPull)
      .onUpdate((event) => {
        ritual.updatePaperPull(Math.max(0, event.translationY) / Math.max(1, 145 * geometry.scale));
      })
      .onFinalize(ritual.endPaperPull),
    [geometry.scale, ritual.beginPaperPull, ritual.endPaperPull, ritual.updatePaperPull],
  );

  const instruction =
    ritual.phase === "idle" || ritual.phase === "cookie-selected"
      ? "Выбери одно печенье"
      : ritual.phase === "ready-to-break" || ritual.phase === "breaking"
        ? "Разломи печенье"
        : ritual.phase === "broken" || ritual.phase === "paper-pulling"
          ? "Достань записку"
          : "Твоё предсказание";

  const breakEnabled = ritual.phase === "ready-to-break" || ritual.phase === "breaking";
  const paperEnabled = ritual.phase === "broken" || ritual.phase === "paper-pulling";

  return (
    <View style={styles.screen}>
      <FortuneCookieScene
        geometry={geometry}
        phase={ritual.phase}
        selectedCookie={ritual.selectedCookie}
        entry={ritual.entry}
        onSelect={ritual.selectCookie}
        selectionProgress={ritual.selectionProgress}
        breakProgress={ritual.breakProgress}
        crumbProgress={ritual.crumbProgress}
        pullProgress={ritual.pullProgress}
        revealProgress={ritual.revealProgress}
        hintProgress={ritual.hintProgress}
      />

      {breakEnabled ? (
        <GestureDetector gesture={breakGesture}>
          <View
            collapsable={false}
            accessibilityLabel="Разломить печенье"
            accessibilityHint="Разведите два пальца в стороны. Одним пальцем можно провести в сторону."
            style={[styles.gestureArea, geometry.breakGesture]}
          />
        </GestureDetector>
      ) : null}

      {paperEnabled ? (
        <GestureDetector gesture={paperGesture}>
          <View
            accessibilityLabel="Достать записку"
            accessibilityHint="Потяните бумажную полоску вниз."
            style={[styles.gestureArea, geometry.paperGesture]}
          />
        </GestureDetector>
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View pointerEvents="none" style={styles.heading}>
          <Text selectable style={styles.instruction}>{instruction}</Text>
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          {ritual.phase === "idle" ? (
            <Text selectable style={styles.footerHint}>КОСНИСЬ ОДНОГО ПЕЧЕНЬЯ</Text>
          ) : null}
          {paperEnabled ? (
            <Text selectable style={styles.footerHint}>ПОТЯНИ ЗА КРАЙ БУМАГИ</Text>
          ) : null}
          {ritual.phase === "completed" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Выбрать другое печенье"
              onPress={ritual.resetRitual}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>ЕЩЁ ПЕЧЕНЬЕ</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
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
  heading: { alignItems: "center", paddingTop: 18 },
  instruction: {
    color: "rgba(234,219,193,0.92)",
    fontSize: 18,
    lineHeight: 25,
    fontFamily: "serif",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 10,
  },
  footer: { minHeight: 68, alignItems: "center", justifyContent: "center", paddingBottom: 12 },
  footerHint: {
    color: "rgba(234,219,193,0.74)",
    fontSize: 9,
    letterSpacing: 2.1,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.98)",
    textShadowRadius: 8,
  },
  actionButton: {
    minWidth: 182,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.36)",
    backgroundColor: "rgba(7,9,10,0.82)",
  },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionText: {
    color: "rgba(239,225,200,0.94)",
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "600",
  },
});
