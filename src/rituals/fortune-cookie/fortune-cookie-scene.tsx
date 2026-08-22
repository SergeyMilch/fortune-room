import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import type { FortuneCookieEntry } from "./content/fortune-cookie-content-types";
import { FortuneCookieCandleFlame } from "./fortune-cookie-candle-flame";
import type { FortuneCookieGeometry } from "./fortune-cookie-geometry";
import type { FortuneCookiePhase } from "./use-fortune-cookie-ritual";

const assets = {
  background: require("../../../assets/fortune-cookie/runtime/scene-background-no-flame.png"),
  tray: require("../../../assets/fortune-cookie/runtime/tray.png"),
  cookies: [
    require("../../../assets/fortune-cookie/runtime/cookie-01.png"),
    require("../../../assets/fortune-cookie/runtime/cookie-02.png"),
    require("../../../assets/fortune-cookie/runtime/cookie-03.png"),
  ],
  leftHalf: require("../../../assets/fortune-cookie/runtime/cookie-left-half.png"),
  rightHalf: require("../../../assets/fortune-cookie/runtime/cookie-right-half.png"),
  paper: require("../../../assets/fortune-cookie/runtime/paper-strip.png"),
  crumbs: [
    require("../../../assets/fortune-cookie/runtime/crumbs-01.png"),
    require("../../../assets/fortune-cookie/runtime/crumbs-02.png"),
    require("../../../assets/fortune-cookie/runtime/crumbs-03.png"),
  ],
} as const;

type ProgressProps = {
  selectionProgress: SharedValue<number>;
  breakProgress: SharedValue<number>;
  crumbProgress: SharedValue<number>;
  pullProgress: SharedValue<number>;
  revealProgress: SharedValue<number>;
  hintProgress: SharedValue<number>;
};

function PaperPredictionText({
  text,
  fontFamily,
  baseFontSize,
}: {
  text: string;
  fontFamily: string;
  baseFontSize: number;
}) {
  const [fontSize, setFontSize] = useState(baseFontSize);
  const minimumFontSize = Math.max(14, baseFontSize * 0.72);
  const displayText = text.replace(/\.+\s*$/u, "");

  useEffect(() => {
    setFontSize(baseFontSize);
  }, [baseFontSize]);

  return (
    <Text
      allowFontScaling={false}
      onTextLayout={(event) => {
        if (event.nativeEvent.lines.length <= 2) return;
        setFontSize((current) => current > minimumFontSize
          ? Math.max(minimumFontSize, current - 1)
          : current);
      }}
      style={[
        styles.paperText,
        {
          fontFamily,
          fontSize,
          lineHeight: fontSize * 1.08,
        },
      ]}
    >
      {displayText}
    </Text>
  );
}

function CookieSprite({
  index,
  geometry,
  selectedCookie,
  interactive,
  wholeVisible,
  onSelect,
  selectionProgress,
  breakProgress,
}: {
  index: number;
  geometry: FortuneCookieGeometry;
  selectedCookie: number | null;
  interactive: boolean;
  wholeVisible: boolean;
  onSelect: (index: number) => void;
  selectionProgress: SharedValue<number>;
  breakProgress: SharedValue<number>;
}) {
  const rect = geometry.cookies[index];
  const isSelected = selectedCookie === index;
  const target = geometry.selectedCookie;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;
  const sourceCenterX = rect.left + rect.width / 2;
  const sourceCenterY = rect.top + rect.height / 2;
  const selectedScale = target.width / rect.width;

  const animatedStyle = useAnimatedStyle(() => {
    const selection = selectionProgress.value;
    if (isSelected) {
      const scale = interpolate(selection, [0, 1], [1, selectedScale], Extrapolation.CLAMP);
      const stressX = 1 + breakProgress.value * 0.055;
      const stressY = 1 - breakProgress.value * 0.035;
      return {
        opacity: wholeVisible ? 1 : 0,
        transform: [
          { translateX: (targetCenterX - sourceCenterX) * selection },
          { translateY: (targetCenterY - sourceCenterY) * selection },
          { scaleX: scale * stressX },
          { scaleY: scale * stressY },
        ],
      };
    }
    const direction = index === 0 ? -1 : 1;
    return {
      opacity: interpolate(selection, [0, 1], [1, 0.14], Extrapolation.CLAMP),
      transform: [
        { translateX: direction * selection * 12 * geometry.scale },
        { scale: interpolate(selection, [0, 1], [1, 0.94], Extrapolation.CLAMP) },
      ],
    };
  }, [geometry.scale, isSelected, selectedScale, sourceCenterX, sourceCenterY, targetCenterX, targetCenterY, wholeVisible]);

  return (
    <Animated.View
      style={[
        styles.absolute,
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        animatedStyle,
      ]}
    >
      <View pointerEvents="none" style={styles.cookieShadow} />
      <Image source={assets.cookies[index]} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Печенье ${index + 1}`}
        disabled={!interactive}
        onPress={() => onSelect(index)}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function BrokenCookie({
  geometry,
  visible,
  breakProgress,
}: {
  geometry: FortuneCookieGeometry;
  visible: boolean;
  breakProgress: SharedValue<number>;
}) {
  const leftStyle = useAnimatedStyle(() => ({
    opacity: visible ? 1 : 0,
    transform: [
      { translateX: interpolate(breakProgress.value, [0.55, 1], [95 * geometry.scale, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(breakProgress.value, [0.55, 1], [0, -5], Extrapolation.CLAMP)}deg` },
    ],
  }), [geometry.scale, visible]);
  const rightStyle = useAnimatedStyle(() => ({
    opacity: visible ? 1 : 0,
    transform: [
      { translateX: interpolate(breakProgress.value, [0.55, 1], [-95 * geometry.scale, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(breakProgress.value, [0.55, 1], [0, 5], Extrapolation.CLAMP)}deg` },
    ],
  }), [geometry.scale, visible]);

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.absolute, geometry.leftHalf, leftStyle]}>
        <Image source={assets.leftHalf} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.absolute, geometry.rightHalf, rightStyle]}>
        <Image source={assets.rightHalf} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

function Crumbs({ geometry, visible, progress }: {
  geometry: FortuneCookieGeometry;
  visible: boolean;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: visible ? interpolate(progress.value, [0, 0.18, 1], [0, 1, 0.72], Extrapolation.CLAMP) : 0,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-22 * geometry.scale, 38 * geometry.scale]) },
      { scale: interpolate(progress.value, [0, 1], [0.82, 1]) },
    ],
  }), [geometry.scale, visible]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absolute,
        {
          left: geometry.artwork.left + 205 * geometry.scale,
          top: geometry.artwork.top + 1040 * geometry.scale,
          width: 480 * geometry.scale,
          height: 210 * geometry.scale,
        },
        style,
      ]}
    >
      <Image source={assets.crumbs[1]} contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function PaperReveal({
  geometry,
  visible,
  showText,
  entry,
  fontFamily,
  pullProgress,
  revealProgress,
}: {
  geometry: FortuneCookieGeometry;
  visible: boolean;
  showText: boolean;
  entry: FortuneCookieEntry | null;
  fontFamily: string;
  pullProgress: SharedValue<number>;
  revealProgress: SharedValue<number>;
}) {
  const paperFontSize = Math.max(20, 30 * geometry.scale);
  const style = useAnimatedStyle(() => {
    const pull = pullProgress.value;
    const reveal = revealProgress.value;
    return {
      opacity: visible ? 1 : 0,
      transform: [
        { translateY: interpolate(reveal, [0, 1], [(220 + pull * 85) * geometry.scale, 0]) },
        { rotate: `${interpolate(reveal, [0, 1], [90 - pull * 22, 0])}deg` },
        { scale: interpolate(reveal, [0, 1], [0.22 + pull * 0.28, 1]) },
      ],
    };
  }, [geometry.scale, visible]);
  return (
    <Animated.View pointerEvents="none" style={[styles.absolute, geometry.paper, style]}>
      <Image source={assets.paper} contentFit="fill" transition={0} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.paperTextWrap,
          {
            opacity: showText ? 1 : 0,
            paddingVertical: geometry.paper.height * 0.54,
            transform: [{ translateY: -2 }],
          },
        ]}
      >
        <PaperPredictionText
          key={entry?.id ?? "empty"}
          text={entry?.text ?? ""}
          fontFamily={fontFamily}
          baseFontSize={paperFontSize}
        />
      </View>
    </Animated.View>
  );
}

function BreakHint({ geometry, visible, progress }: {
  geometry: FortuneCookieGeometry;
  visible: boolean;
  progress: SharedValue<number>;
}) {
  const leftStyle = useAnimatedStyle(() => ({
    opacity: visible ? 0.68 * (1 - progress.value) : 0,
    transform: [{ translateX: -progress.value * 54 * geometry.scale }],
  }), [geometry.scale, visible]);
  const rightStyle = useAnimatedStyle(() => ({
    opacity: visible ? 0.68 * (1 - progress.value) : 0,
    transform: [{ translateX: progress.value * 54 * geometry.scale }],
  }), [geometry.scale, visible]);
  const centerX = geometry.selectedCookie.left + geometry.selectedCookie.width / 2;
  const centerY = geometry.selectedCookie.top + geometry.selectedCookie.height * 0.55;
  const size = Math.max(9, 17 * geometry.scale);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.hintDot, { left: centerX - size * 2.1, top: centerY, width: size, height: size, borderRadius: size / 2 }, leftStyle]} />
      <Animated.View style={[styles.hintDot, { left: centerX + size * 1.1, top: centerY, width: size, height: size, borderRadius: size / 2 }, rightStyle]} />
    </View>
  );
}

export function FortuneCookieScene({
  geometry,
  phase,
  selectedCookie,
  entry,
  onSelect,
  selectionProgress,
  breakProgress,
  crumbProgress,
  pullProgress,
  revealProgress,
  hintProgress,
}: {
  geometry: FortuneCookieGeometry;
  phase: FortuneCookiePhase;
  selectedCookie: number | null;
  entry: FortuneCookieEntry | null;
  onSelect: (index: number) => void;
} & ProgressProps) {
  const [fontsLoaded] = useFonts({ Sjz: require("../../../assets/fonts/sjz.otf") });
  const wholeVisible = !["broken", "paper-pulling", "paper-revealed", "completed"].includes(phase);
  const brokenVisible = !wholeVisible;
  const paperVisible = ["broken", "paper-pulling", "paper-revealed", "completed"].includes(phase);
  const dimStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value * 0.36,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={assets.background}
        contentFit="fill"
        transition={0}
        style={[styles.absolute, geometry.artwork]}
      />
      <FortuneCookieCandleFlame geometry={geometry} />
      <Image source={assets.tray} contentFit="fill" transition={0} style={[styles.absolute, geometry.tray]} />
      {[0, 1, 2].map((index) => (
        <CookieSprite
          key={index}
          index={index}
          geometry={geometry}
          selectedCookie={selectedCookie}
          interactive={phase === "idle"}
          wholeVisible={wholeVisible}
          onSelect={onSelect}
          selectionProgress={selectionProgress}
          breakProgress={breakProgress}
        />
      ))}
      <Crumbs geometry={geometry} visible={brokenVisible} progress={crumbProgress} />
      <BrokenCookie geometry={geometry} visible={brokenVisible} breakProgress={breakProgress} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
      <PaperReveal
        geometry={geometry}
        visible={paperVisible}
        showText={phase === "paper-revealed" || phase === "completed"}
        entry={entry}
        fontFamily={fontsLoaded ? "Sjz" : "serif"}
        pullProgress={pullProgress}
        revealProgress={revealProgress}
      />
      <BreakHint geometry={geometry} visible={phase === "ready-to-break"} progress={hintProgress} />
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: "absolute" },
  cookieShadow: {
    position: "absolute",
    left: "14%",
    right: "14%",
    bottom: "13%",
    height: "22%",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.28)",
    boxShadow: "0 6px 12px rgba(0,0,0,0.48)",
  },
  dim: { backgroundColor: "#020304" },
  hintDot: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(244,221,174,0.82)",
    backgroundColor: "rgba(225,181,112,0.3)",
  },
  paperTextWrap: {
    position: "absolute",
    top: "-50%",
    right: 0,
    bottom: "-50%",
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: "8%",
    paddingVertical: 0,
    zIndex: 2,
  },
  paperText: {
    width: "100%",
    color: "#2D190B",
    includeFontPadding: true,
    textAlign: "center",
    textAlignVertical: "center",
    textShadowColor: "rgba(255,240,204,0.26)",
    textShadowRadius: 1,
  },
});
