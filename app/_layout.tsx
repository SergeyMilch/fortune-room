import { useCallback, useEffect, useState } from "react";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { prepareStartupAssets } from "@/startup/startup-assets";
import { StartupLoadingScreen } from "@/startup/startup-loading-screen";
import { palette } from "@/theme/palette";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
if (Constants.expoVersion === null) {
  SplashScreen.setOptions({ duration: 280, fade: true });
}

export default function RootLayout() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(true);

  useEffect(() => {
    let active = true;
    void prepareStartupAssets().then(() => {
      if (active) setAssetsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLoadingScreenVisible = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  const handleLoadingDismiss = useCallback(() => {
    setLoadingVisible(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.ink }}>
      <StatusBar barStyle="light-content" backgroundColor={palette.ink} />
      {assetsReady ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="crystal-ball" options={{ animation: "fade", animationDuration: 280 }} />
          <Stack.Screen name="fortune-book" options={{ animation: "fade", animationDuration: 320 }} />
          <Stack.Screen name="fortune-cookie" options={{ animation: "fade", animationDuration: 300 }} />
          <Stack.Screen name="fortune-coin" options={{ animation: "fade", animationDuration: 280 }} />
          <Stack.Screen name="runes" options={{ animation: "fade", animationDuration: 320 }} />
        </Stack>
      ) : null}
      {loadingVisible ? (
        <StartupLoadingScreen
          ready={assetsReady}
          onVisualReady={handleLoadingScreenVisible}
          onDismiss={handleLoadingDismiss}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}
