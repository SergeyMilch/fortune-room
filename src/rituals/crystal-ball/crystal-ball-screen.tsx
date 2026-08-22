import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFonts } from "expo-font";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";

import { palette } from "@/theme/palette";

import {
  CrystalBallCandleResponse,
  CrystalBallFrontSmoke,
  CrystalBallGlassShimmer,
  CrystalBallInnerEffects,
  CrystalBallSmokeLayer,
} from "./crystal-ball-effects";
import { CandleFlameFlipbook } from "./candle-flame-flipbook";
import { getCrystalBallGeometry } from "./crystal-ball-geometry";
import { CrystalBallLayeredScene } from "./crystal-ball-layered-scene";
import { crystalBallVfx } from "./crystal-ball-vfx-config";
import { useCrystalBallAudio } from "./use-crystal-ball-audio";
import { useCrystalBallRitual } from "./use-crystal-ball-ritual";

export function CrystalBallScreen() {
  const [fontsLoaded] = useFonts({
    MrAkronim: require("../../../assets/fonts/mr-akronim.otf"),
  });
  const { width, height } = useWindowDimensions();
  const geometry = getCrystalBallGeometry(width, height);
  const { sphere, prediction: predictionRegion } = geometry;
  const { phase, currentPrediction, touch, ritual, prediction, onPressIn, onPressOut } =
    useCrystalBallRitual();
  useCrystalBallAudio(ritual, prediction);

  const orbStyle = useAnimatedStyle(() => {
    const peak = Math.max(0, (ritual.value - 0.78) / 0.22) * (1 - prediction.value);
    return {
      transform: [{ scale: 1 + touch.value * 0.0035 + peak * 0.0015 }],
    };
  });
  const dimStyle = useAnimatedStyle(() => {
    const focus = ritual.value * (1 - prediction.value * 0.36);
    return {
      opacity: interpolate(
        focus,
        [0, 0.35, 1],
        [0, crystalBallVfx.sceneDimPeak * 0.42, crystalBallVfx.sceneDimPeak],
      ),
    };
  });
  const predictionWrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(prediction.value, [0, 0.14, 1], [0, 0.42, 1]),
    transform: [
      { translateY: interpolate(prediction.value, [0, 1], [5, 0]) },
      { scale: interpolate(prediction.value, [0, 1], [0.985, 1]) },
    ],
  }));
  const predictionMistStyle = useAnimatedStyle(() => ({
    opacity: interpolate(prediction.value, [0, 0.1, 0.42, 0.75, 1], [0, 0.18, 0.48, 0.22, 0.18]),
    transform: [{ translateY: interpolate(prediction.value, [0, 1], [4, -1]) }],
  }));
  const predictionTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(prediction.value, [0, 0.22, 0.58, 1], [0, 0.18, 0.78, 1]),
    textShadowRadius: interpolate(prediction.value, [0, 1], [10, 3]),
  }));

  const instruction =
    phase === "idle"
      ? "Задай вопрос мысленно"
      : phase === "holding"
        ? "Не отпускай…"
        : phase === "revealed"
          ? "Коснись, чтобы спросить снова"
          : "Слушай тишину";

  const predictionText = (currentPrediction?.text ?? "")
    .replace(/\.\s*$/u, "")
    .toLocaleUpperCase("ru-RU");
  const predictionFontSize = Math.max(12, Math.min(15, sphere.diameter * 0.072));
  const predictionTextMetrics = {
    fontSize: predictionFontSize,
    lineHeight: predictionFontSize + 4,
  };
  const predictionHorizontalExpansion = sphere.diameter * 0.035;
  const predictionFontStyle = fontsLoaded
    ? { fontFamily: "MrAkronim" }
    : undefined;

  return (
    <View style={styles.screen}>
      <CrystalBallLayeredScene
        sceneDimming={<Animated.View pointerEvents="none" style={[styles.environmentDim, dimStyle]} />}
        candleContent={
          <>
            <CandleFlameFlipbook geometry={geometry} />
            <CrystalBallCandleResponse ritual={ritual} prediction={prediction} />
          </>
        }
        orbStyle={[
          { transformOrigin: [sphere.centerX, sphere.centerY, 0] },
          orbStyle,
        ]}
        innerContent={
          <CrystalBallInnerEffects
            geometry={geometry}
            touch={touch}
            ritual={ritual}
            prediction={prediction}
          />
        }
        predictionContent={
          <Animated.View
            pointerEvents="none"
            style={[
              styles.predictionWrap,
              {
                left: predictionRegion.left - predictionHorizontalExpansion,
                top: predictionRegion.top,
                width: predictionRegion.width + predictionHorizontalExpansion * 2,
                height: predictionRegion.height,
                paddingHorizontal: 0,
              },
              predictionWrapStyle,
            ]}
          >
            <Animated.Text
              maxFontSizeMultiplier={1.15}
              numberOfLines={6}
              style={[
                styles.prediction,
                styles.predictionMist,
                predictionTextMetrics,
                predictionFontStyle,
                predictionMistStyle,
              ]}
            >
              {predictionText}
            </Animated.Text>
            <Animated.Text
              selectable
              maxFontSizeMultiplier={1.15}
              numberOfLines={6}
              style={[
                styles.prediction,
                predictionTextMetrics,
                predictionFontStyle,
                predictionTextStyle,
              ]}
            >
              {predictionText}
            </Animated.Text>
          </Animated.View>
        }
        smokeContent={
          <CrystalBallSmokeLayer
            geometry={geometry}
            touch={touch}
            ritual={ritual}
            prediction={prediction}
          />
        }
        glassContent={<CrystalBallGlassShimmer sphere={sphere} prediction={prediction} />}
        frontContent={<CrystalBallFrontSmoke ritual={ritual} prediction={prediction} />}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Хрустальный шар"
        accessibilityHint="Нажмите и удерживайте, чтобы получить знак"
        hitSlop={Math.max(8, sphere.diameter * 0.04)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          position: "absolute",
          left: sphere.left,
          top: sphere.top,
          width: sphere.diameter,
          height: sphere.diameter,
          borderRadius: sphere.diameter / 2,
        }}
      />

      <SafeAreaView pointerEvents="none" style={styles.safeArea}>
        <View style={styles.heading}>
          <Text selectable style={styles.instruction}>{instruction}</Text>
        </View>
        <View style={styles.footer}>
          <Text selectable style={styles.holdHint}>КОСНИСЬ И УДЕРЖИВАЙ</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: palette.ink },
  safeArea: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between" },
  environmentDim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#020405",
  },
  heading: { alignItems: "center", paddingTop: "13%" },
  instruction: {
    color: "rgba(231,217,190,0.9)",
    fontSize: 19,
    lineHeight: 27,
    letterSpacing: 0.3,
    textAlign: "center",
    fontFamily: "serif",
    textShadowColor: "rgba(0,0,0,0.92)",
    textShadowRadius: 10,
  },
  predictionWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  prediction: {
    width: "100%",
    color: "#FFF9EC",
    textAlign: "center",
    fontFamily: "serif",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.95)",
  },
  predictionMist: {
    position: "absolute",
    color: "rgba(230,248,250,0.62)",
    textShadowColor: "rgba(154,220,231,0.88)",
    textShadowOffset: { width: -0.5, height: -0.5 },
    textShadowRadius: 4,
  },
  footer: { alignItems: "center", paddingBottom: 18 },
  holdHint: {
    color: "rgba(231,217,190,0.68)",
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowRadius: 8,
  },
});
