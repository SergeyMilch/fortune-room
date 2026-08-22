# Codex task — Crystal Ball Audio Pass

## Scope

Add the prepared audio layer to the already-complete Crystal Ball ritual.

Do not modify:
- Crystal Ball visual effects or artwork;
- ritual state machine;
- ritual timing (currently 4.17 s);
- routing/navigation;
- prediction selection;
- existing haptic checkpoints.

Use `expo-audio`.

## Prepared runtime assets

They already exist under:

```text
assets/audio/
  ambience/
    fortune-room-ambient.mp3
    candle-crackle.mp3

  crystal-ball/
    touch.wav
    charging-loop.mp3
    peak-shimmer.wav
    reveal-chime.wav
```

Do not edit, trim, regenerate, normalize, or replace these files in this task.

## Architecture

Create a small audio service/module responsible for:
- asset/player preload;
- playback;
- looping;
- volume/fades;
- Sound ON/OFF;
- cleanup.

The ritual UI should communicate semantic events/progress only. Do not scatter raw audio player manipulation throughout `crystal-ball-screen.tsx`.

Avoid building a generic application-wide audio engine for future rituals. Build only the smallest clean abstraction needed by the current Crystal Ball + future room ambience.

## Required behavior

### Room ambient

`fortune-room-ambient.mp3`
- loop continuously while the Fortune Room / Crystal Ball audio context is active;
- initial volume range: 0.08–0.12;
- start smoothly, no abrupt full-volume entry.

### Candle layer

`candle-crackle.mp3`
- independent loop;
- very quiet;
- initial volume range: 0.015–0.035;
- it must not sound like a fireplace.

### Touch

`touch.wav`
- play once only when a valid ritual hold begins;
- not on every pointer movement;
- initial volume range: 0.18–0.28.

### Charging

`charging-loop.mp3`
- preload before ritual;
- loop during the charging/build-up period as needed;
- begin at or near volume 0;
- derive volume from existing ritual progress;
- initial target at strong charging/peak: about 0.18–0.24;
- fade down after peak/reveal/settle rather than stopping abruptly.

Do not drive the volume with React frame-by-frame state updates. Use the existing progress/orchestration mechanism or a UI-thread-friendly bridge appropriate for expo-audio.

### Peak

`peak-shimmer.wav`
- one shot;
- synchronize with the existing peak checkpoint / medium haptic;
- initial volume range: 0.28–0.38;
- must not retrigger accidentally.

### Reveal

`reveal-chime.wav`
- one shot when the prediction actually begins its reveal;
- initial volume range: 0.20–0.30;
- it should be softer than the peak shimmer.

## Sound setting

Add/support one master Sound ON/OFF value.

Requirements:
- persisted locally using the project's existing simple KV-storage approach;
- Sound OFF must mute/stop all currently active audio immediately;
- Sound ON should restore ambient behavior without restarting the ritual;
- do not couple Sound and Haptic settings;
- preserve existing Haptic ON/OFF behavior.

If a full Settings screen does not yet exist, implement the persisted setting/service API only. Do not invent a new settings UI in this task.

## Lifecycle

On repeat/reset:
- no duplicate loops;
- old charging state is reset;
- one-shots are ready for the next ritual.

On leaving/unmounting the ritual:
- ritual-specific audio stops/cleans up;
- no orphaned player keeps running.

Do not leak multiple audio players across repeated navigation.

## Preloading

Preload the local assets early enough that touch/peak/reveal one-shots do not have a noticeable first-play delay.

Do not use remote audio URLs.

## Mixing

Do not globally boost all assets because one sound seems quiet.

Start from the volume ranges above and preserve hierarchy:

```text
ambient/candle < charging < reveal < peak
```

Actual final values will be calibrated by the user on a real Android device.

## UI click

Do not add a generic UI click sound yet. It belongs to the later Fortune Room home/settings pass.

## Build/test

- Expo Go/local workflow is enough for this pass.
- Do not run EAS cloud build.
- Run `npm run typecheck`.

## Final report

Report briefly:
1. files changed/created;
2. AudioService/API shape;
3. preload strategy;
4. exact semantic events connected to touch/charging/peak/reveal;
5. final initial volume values;
6. Sound ON/OFF persistence location;
7. cleanup/reset behavior;
8. `npm run typecheck` result.

Then STOP.

Do not continue to the Fortune Room home screen, prediction content pack, or another ritual until the audio has been checked on a real Android device.
