import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { palette } from "@/theme/palette";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.ink }}>
      <StatusBar barStyle="light-content" backgroundColor={palette.ink} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="crystal-ball" options={{ animation: "fade", animationDuration: 280 }} />
        <Stack.Screen name="fortune-book" options={{ animation: "fade", animationDuration: 320 }} />
        <Stack.Screen name="fortune-cookie" options={{ animation: "fade", animationDuration: 300 }} />
        <Stack.Screen name="fortune-coin" options={{ animation: "fade", animationDuration: 280 }} />
        <Stack.Screen name="runes" options={{ animation: "fade", animationDuration: 320 }} />
        <Stack.Screen name="developer-lab" options={{ animation: "fade", animationDuration: 180 }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
