import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFonts } from "expo-font";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { FortuneBookEntry } from "./fortune-book-content";
import type {
  FortuneBookGeometry,
  FortuneBookLinePlane,
  FortuneBookPagePlane,
} from "./fortune-book-geometry";
import { FortuneBookCandleFlames } from "./fortune-book-candle-flames";
import { FortuneBookPageCurl } from "./fortune-book-page-curl";
import type { FortuneBookPhase } from "./use-fortune-book-ritual";

const sceneAssets = {
  closed: require("../../../assets/fortune-book/scene/book-closed-no-flames.png"),
} as const;

type ProgressProps = {
  openProgress: SharedValue<number>;
  pageTurn: SharedValue<number>;
  linesProgress: SharedValue<number>;
  selectionProgress: SharedValue<number>;
  revealProgress: SharedValue<number>;
  settle: SharedValue<number>;
};

const dustParticles = [
  { x: 0.18, y: 0.3, delay: 0, duration: 7600 },
  { x: 0.7, y: 0.24, delay: 1700, duration: 8800 },
  { x: 0.48, y: 0.42, delay: 3100, duration: 9400 },
  { x: 0.8, y: 0.58, delay: 900, duration: 8200 },
] as const;

const bookLineTypography = {
  sourceFontSize: 11.5,
  minimumFontSize: 8,
  maximumFontSize: 9.5,
  lineHeightRatio: 1.08,
} as const;

function formatBookLine(line: string) {
  const paragraph = line.trim();
  if (!paragraph) return paragraph;
  return paragraph[0].toLocaleUpperCase("ru-RU") + paragraph.slice(1);
}

function DustParticle({ particle }: { particle: (typeof dustParticles)[number] }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [particle.delay, particle.duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * 0.18,
    transform: [
      { translateY: -16 * progress.value },
      { translateX: 5 * Math.sin(progress.value * Math.PI) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.dust,
        { left: `${particle.x * 100}%`, top: `${particle.y * 100}%` },
        style,
      ]}
    />
  );
}

function AmbientLight() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: 0.015 + pulse.value * 0.022 }));
  return <Animated.View pointerEvents="none" style={[styles.ambientLight, style]} />;
}

function FortuneLine({
  entry,
  plane,
  fontSize,
  lineHeight,
  fontFamily,
  enabled,
  selected,
  selectionExists,
  onSelect,
  linesProgress,
  selectionProgress,
  revealProgress,
}: {
  entry: FortuneBookEntry;
  plane: FortuneBookLinePlane;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  enabled: boolean;
  selected: boolean;
  selectionExists: boolean;
  onSelect: (id: string) => void;
  linesProgress: SharedValue<number>;
  selectionProgress: SharedValue<number>;
  revealProgress: SharedValue<number>;
}) {
  const paragraph = formatBookLine(entry.line);
  const prominenceStyle = useAnimatedStyle(() => {
    const selectedOpacity = selected
      ? 1
      : interpolate(selectionProgress.value, [0, 1], [1, 0.3]);
    const revealOpacity = selected
      ? 1
      : interpolate(revealProgress.value, [0, 1], [selectedOpacity, 0.22]);

    return {
      opacity: linesProgress.value * (selectionExists ? revealOpacity : 1),
      transform: [
        { translateY: interpolate(linesProgress.value, [0, 1], [5, 0]) },
        { scale: selected ? interpolate(selectionProgress.value, [0, 1], [1, 1.025]) : 1 },
      ],
      backgroundColor: selected
        ? interpolateColor(
            selectionProgress.value,
            [0, 1],
            ["rgba(180,118,43,0)", "rgba(180,118,43,0.16)"],
          )
        : "rgba(180,118,43,0)",
      borderColor: selected
        ? interpolateColor(
            selectionProgress.value,
            [0, 1],
            ["rgba(114,70,27,0)", "rgba(132,78,28,0.2)"],
          )
        : "rgba(114,70,27,0)",
    };
  });

  return (
    <View
      style={[
        styles.lineSlot,
        {
          left: plane.frame.left,
          top: plane.frame.top,
          width: plane.frame.width,
          height: plane.frame.height,
          borderRadius: plane.frame.borderRadius,
          transform: [{ rotateZ: `${plane.rotationDeg}deg` }],
        },
      ]}
    >
      <Animated.View style={[styles.lineAnimated, prominenceStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paragraph}
          accessibilityHint="Выбрать эту строку"
          disabled={!enabled}
          hitSlop={4}
          onPress={() => onSelect(entry.id)}
          style={styles.linePressable}
        >
          <Text
            selectable
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling={false}
            style={[styles.lineText, { fontFamily, fontSize, lineHeight }]}
          >
            {paragraph}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function FortunePageLines({
  page,
  entries,
  fontSize,
  lineHeight,
  fontFamily,
  phase,
  selectedId,
  onSelect,
  linesProgress,
  selectionProgress,
  revealProgress,
}: {
  page: FortuneBookPagePlane;
  entries: FortuneBookEntry[];
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  phase: FortuneBookPhase;
  selectedId: string | null;
  onSelect: (id: string) => void;
  linesProgress: SharedValue<number>;
  selectionProgress: SharedValue<number>;
  revealProgress: SharedValue<number>;
}) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {entries.map((entry, index) => (
        <FortuneLine
          key={entry.id}
          entry={entry}
          plane={page.rows[index]}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontFamily={fontFamily}
          enabled={phase === "pageReady"}
          selected={entry.id === selectedId}
          selectionExists={selectedId !== null}
          onSelect={onSelect}
          linesProgress={linesProgress}
          selectionProgress={selectionProgress}
          revealProgress={revealProgress}
        />
      ))}
    </View>
  );
}

export function FortuneBookScene({
  geometry,
  phase,
  entries,
  selectedId,
  onSelect,
  openProgress,
  pageTurn,
  linesProgress,
  selectionProgress,
  revealProgress,
  settle,
}: {
  geometry: FortuneBookGeometry;
  phase: FortuneBookPhase;
  entries: FortuneBookEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
} & ProgressProps) {
  const [fontsLoaded] = useFonts({
    Balkara: require("../../../assets/fonts/balkara.ttf"),
  });
  const openSceneStyle = useAnimatedStyle(() => ({
    opacity: openProgress.value,
    transform: [
      { scale: interpolate(openProgress.value, [0, 1], [0.985, 1]) },
      { translateY: settle.value * 2 },
    ],
  }));
  const closedSceneStyle = useAnimatedStyle(() => ({
    opacity: 1 - openProgress.value,
    transform: [{ scale: interpolate(openProgress.value, [0, 1], [1, 1.018]) }],
  }));
  const interpretationStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [{ translateY: interpolate(revealProgress.value, [0, 1], [8, 0]) }],
  }));
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const showPageTurn = phase === "flipping" || phase === "stopping";
  const showLines = ["pageReady", "lineSelected", "revealing", "result"].includes(phase);
  const lineFontSize = Math.max(
    bookLineTypography.minimumFontSize,
    Math.min(
      bookLineTypography.maximumFontSize,
      bookLineTypography.sourceFontSize * geometry.scale,
    ),
  );
  const lineHeight = lineFontSize * bookLineTypography.lineHeightRatio;
  const lineFontFamily = fontsLoaded ? "Balkara" : "serif";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, openSceneStyle]}>
        <FortuneBookPageCurl
          geometry={geometry}
          progress={pageTurn}
          active={showPageTurn}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, closedSceneStyle]}>
        <Image
          source={sceneAssets.closed}
          contentFit="fill"
          transition={0}
          style={[styles.closedScene, geometry.artwork]}
        />
      </Animated.View>

      <AmbientLight />
      {dustParticles.map((particle) => (
        <DustParticle key={`${particle.x}-${particle.y}`} particle={particle} />
      ))}

      {showLines ? (
        <>
          <FortunePageLines
            page={geometry.leftPage}
            entries={entries.slice(0, 10)}
            fontSize={lineFontSize}
            lineHeight={lineHeight}
            fontFamily={lineFontFamily}
            phase={phase}
            selectedId={selectedId}
            onSelect={onSelect}
            linesProgress={linesProgress}
            selectionProgress={selectionProgress}
            revealProgress={revealProgress}
          />
          <FortunePageLines
            page={geometry.rightPage}
            entries={entries.slice(10, 20)}
            fontSize={lineFontSize}
            lineHeight={lineHeight}
            fontFamily={lineFontFamily}
            phase={phase}
            selectedId={selectedId}
            onSelect={onSelect}
            linesProgress={linesProgress}
            selectionProgress={selectionProgress}
            revealProgress={revealProgress}
          />
        </>
      ) : null}

      <FortuneBookCandleFlames geometry={geometry} openProgress={openProgress} />

      {selectedEntry && (phase === "revealing" || phase === "result") ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.interpretation,
            {
              left: geometry.interpretation.left,
              top: geometry.interpretation.top,
              width: geometry.interpretation.width,
              minHeight: geometry.interpretation.height,
              borderRadius: geometry.interpretation.borderRadius,
            },
            interpretationStyle,
          ]}
        >
          <Text
            selectable
            allowFontScaling={false}
            style={[
              styles.interpretationText,
              {
                fontFamily: lineFontFamily,
                fontSize: Math.max(17, 24 * geometry.scale),
                lineHeight: Math.max(22, 31 * geometry.scale),
              },
            ]}
          >
            {selectedEntry.interpretation}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  closedScene: {
    position: "absolute",
  },
  ambientLight: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#D69A4B",
  },
  dust: {
    position: "absolute",
    width: 1.4,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: "#F0DDB9",
  },
  lineSlot: {
    position: "absolute",
    overflow: "hidden",
  },
  lineAnimated: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 7,
  },
  linePressable: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  lineText: {
    width: "100%",
    color: "rgba(61,39,24,0.84)",
    letterSpacing: 0.05,
    textAlign: "left",
    textShadowColor: "rgba(238,205,150,0.1)",
    textShadowRadius: 0.5,
  },
  interpretation: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.22)",
    backgroundColor: "rgba(7,9,10,0.82)",
  },
  interpretationText: {
    color: "rgba(239,225,200,0.94)",
    textAlign: "center",
  },
});
