# Fortune Room — Crystal Ball Implementation Plan

## Approved technical baseline

- Expo SDK 56;
- React Native with strict TypeScript;
- Expo Router;
- React Native Reanimated for interaction, transitions, and animation orchestration;
- React Native Skia for the sphere's glow, masks, smoke, particles, and dynamic light where it materially improves quality;
- `expo-audio` for sound;
- `expo-haptics` for tactile feedback;
- Android is the primary development and validation platform.

Expo Go is limited to the earliest visual/Skia proof. The architecture must not depend on Expo Go. After the base scene is confirmed, move early to an Expo Development Build close to the production Android environment.

Use local Android builds:

```text
npx expo run:android
```

After the native development build is installed, use `npx expo start` for normal JS/TS iteration. Rebuild locally only when native dependencies or native configuration change.

Do not run cloud `eas build` without explicit user approval.

## Current scope

The only active vertical slice is **Crystal Ball**. Do not implement PredictionEngine, history, daily prediction, streak, cosmetics, ads, notifications, sharing, Book, Cookie, Coin, or Runes at this stage.

## Next stages

1. Confirm the approved Candlelit Axis composition and layer boundaries.
2. Prepare and review the required source/runtime asset set.
3. Create the Expo SDK 56 project and an early static visual/Skia proof.
4. Build the static room and responsive Crystal Ball scene.
5. Move to a local Android Development Build.
6. Implement touch/hold interaction and the 2–4 second reveal sequence.
7. Add and synchronize sound and haptics.
8. Validate and polish on a physical Android device: FPS, touch latency, timing, readability, safe areas, and different screen sizes.

