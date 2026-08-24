import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { audioService } from "@/services/audio-service";
import { hapticService } from "@/services/haptic-service";
import { palette } from "@/theme/palette";

import { FortuneRoomHomeScene } from "./fortune-room-home-scene";
import {
  getHomeGeometry,
  homeItems,
  type HomeItemConfig,
  type HomeItemId,
} from "./fortune-room-home-geometry";
import { FortuneRoomHomeSettings } from "./fortune-room-home-settings";

export function FortuneRoomHomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [sceneSize, setSceneSize] = useState({ width, height });
  const geometry = useMemo(
    () => getHomeGeometry(sceneSize.width, sceneSize.height),
    [sceneSize.height, sceneSize.width],
  );
  const [focusedItem, setFocusedItem] = useState<HomeItemId | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const clearFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationPending = useRef(false);

  useEffect(() => {
    void audioService.activateHomeContext();
    void Promise.all([audioService.getSoundEnabled(), hapticService.getHapticEnabled()]).then(
      ([sound, haptic]) => {
        setSoundEnabled(sound);
        setHapticEnabled(haptic);
      },
    );

    return () => {
      if (clearFeedbackTimer.current) clearTimeout(clearFeedbackTimer.current);
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      audioService.deactivateHomeContext();
    };
  }, []);

  const clearFeedbackSoon = useCallback((delayMs: number) => {
    if (clearFeedbackTimer.current) clearTimeout(clearFeedbackTimer.current);
    clearFeedbackTimer.current = setTimeout(() => {
      setFocusedItem(null);
      setHint(null);
    }, delayMs);
  }, []);

  const handleItemPress = useCallback(
    (item: HomeItemConfig) => {
      if (navigationPending.current) return;
      setFocusedItem(item.id);
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!item.enabled) {
        setHint("ЭТОТ РИТУАЛ ЕЩЁ СПИТ");
        clearFeedbackSoon(1250);
        return;
      }

      if (!item.route) return;

      navigationPending.current = true;
      navigationTimer.current = setTimeout(() => {
        router.push(item.route as Href);
        navigationPending.current = false;
      }, 260);
    },
    [clearFeedbackSoon, router],
  );

  const handleSoundChange = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    void audioService.setSoundEnabled(enabled);
  }, []);

  const handleHapticChange = useCallback((enabled: boolean) => {
    setHapticEnabled(enabled);
    void hapticService.setHapticEnabled(enabled);
  }, []);

  const handleSceneLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    setSceneSize((current) => {
      if (current.width === next.width && current.height === next.height) return current;
      return { width: next.width, height: next.height };
    });
  }, []);

  return (
    <View onLayout={handleSceneLayout} style={styles.screen}>
      <FortuneRoomHomeScene geometry={geometry} focusedItem={focusedItem} />

      {homeItems.map((item) => {
        const region = geometry.items[item.id];
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.enabled ? "Открывает ритуал" : "Ритуал пока недоступен"}
            hitSlop={Math.max(6, item.hitSlop * geometry.scale)}
            onPress={() => handleItemPress(item)}
            style={{
              position: "absolute",
              left: region.left,
              top: region.top,
              width: region.width,
              height: region.height,
              borderRadius: region.borderRadius,
            }}
          />
        );
      })}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Настройки"
            hitSlop={10}
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
          >
            <View style={styles.sliderIcon}>
              <View style={[styles.sliderLine, { top: 3 }]} />
              <View style={[styles.sliderKnob, { top: 0, left: 4 }]} />
              <View style={[styles.sliderLine, { top: 11 }]} />
              <View style={[styles.sliderKnob, { top: 8, right: 4 }]} />
              <View style={[styles.sliderLine, { top: 19 }]} />
              <View style={[styles.sliderKnob, { top: 16, left: 8 }]} />
            </View>
          </Pressable>
        </View>

        <View pointerEvents="none" style={styles.hintArea}>
          {hint ? (
            <Animated.View
              entering={FadeInDown.duration(190)}
              exiting={FadeOutDown.duration(220)}
              style={styles.hint}
            >
              <Text style={styles.hintText}>{hint}</Text>
            </Animated.View>
          ) : null}
        </View>
      </SafeAreaView>

      <FortuneRoomHomeSettings
        visible={settingsVisible}
        soundEnabled={soundEnabled}
        hapticEnabled={hapticEnabled}
        onSoundChange={handleSoundChange}
        onHapticChange={handleHapticChange}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: palette.ink },
  safeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    paddingHorizontal: 14,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(231,217,190,0.2)",
    backgroundColor: "rgba(4,7,9,0.54)",
  },
  settingsPressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  sliderIcon: { width: 20, height: 23 },
  sliderLine: {
    position: "absolute",
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: "rgba(239,226,202,0.82)",
  },
  sliderKnob: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(239,226,202,0.9)",
    backgroundColor: "#171716",
  },
  hintArea: { alignItems: "center", paddingBottom: 22 },
  hint: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.2)",
    backgroundColor: "rgba(4,7,9,0.76)",
  },
  hintText: {
    color: "rgba(237,224,199,0.82)",
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
});
