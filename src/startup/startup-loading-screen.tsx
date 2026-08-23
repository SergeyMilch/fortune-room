import { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { palette } from "@/theme/palette";

const appIcon = require("../../assets/branding/icon.png");

export function StartupLoadingScreen({
  ready,
  onVisualReady,
  onDismiss,
}: {
  ready: boolean;
  onVisualReady: () => void;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;
  const visualReadyReported = useRef(false);

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    const dotsAnimation = Animated.loop(
      Animated.timing(dots, {
        toValue: 1,
        duration: 1350,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    shimmerAnimation.start();
    dotsAnimation.start();
    return () => {
      shimmerAnimation.stop();
      dotsAnimation.stop();
    };
  }, [dots, shimmer]);

  useEffect(() => {
    if (!ready) return;

    const animation = Animated.timing(opacity, {
      toValue: 0,
      delay: 180,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDismiss();
    });
    return () => animation.stop();
  }, [onDismiss, opacity, ready]);

  const reportVisualReady = () => {
    if (visualReadyReported.current) return;
    visualReadyReported.current = true;
    onVisualReady();
  };

  const dotOneOpacity = dots.interpolate({
    inputRange: [0, 0.2, 0.55, 1],
    outputRange: [0.22, 1, 0.22, 0.22],
  });
  const dotTwoOpacity = dots.interpolate({
    inputRange: [0, 0.22, 0.42, 0.78, 1],
    outputRange: [0.22, 0.22, 1, 0.22, 0.22],
  });
  const dotThreeOpacity = dots.interpolate({
    inputRange: [0, 0.45, 0.65, 1],
    outputRange: [0.22, 0.22, 1, 0.22],
  });

  return (
    <Animated.View style={[styles.screen, { opacity }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] }),
            transform: [
              {
                scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }),
              },
            ],
          },
        ]}
      />

      <View style={styles.iconFrame}>
        <Image
          accessibilityLabel="Fortune Room"
          contentFit="cover"
          onError={reportVisualReady}
          onLoad={reportVisualReady}
          source={appIcon}
          style={styles.icon}
          transition={0}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>FORTUNE ROOM</Text>
        <View style={styles.loadingRow}>
          <Text style={styles.loadingText}>ЗАГРУЗКА</Text>
          <View style={styles.dots}>
            <Animated.View style={[styles.dot, { opacity: dotOneOpacity }]} />
            <Animated.View style={[styles.dot, { opacity: dotTwoOpacity }]} />
            <Animated.View style={[styles.dot, { opacity: dotThreeOpacity }]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    overflow: "hidden",
    backgroundColor: palette.ink,
  },
  halo: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "rgba(176, 111, 42, 0.25)",
  },
  iconFrame: {
    width: 196,
    height: 196,
    padding: 2,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "rgba(224, 178, 112, 0.58)",
    backgroundColor: "rgba(211, 149, 72, 0.12)",
  },
  icon: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  copy: { alignItems: "center", gap: 13 },
  title: {
    color: "#E7D2AA",
    fontFamily: "serif",
    fontSize: 18,
    letterSpacing: 4.2,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  loadingText: {
    color: "rgba(231, 210, 170, 0.68)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.8,
  },
  dots: { flexDirection: "row", gap: 4 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D39B55",
  },
});
