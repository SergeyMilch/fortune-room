# Fortune Room — Crystal Ball audio pack

Production-ready first-pass audio assets prepared from the supplied Pixabay downloads.

## Copy into the project

Copy the contents of `assets/audio/` into:

`E:\PROJECTS\Fortune Room\assets\audio\`

Keep `art-source/audio/originals/` in the project (or another source-assets archive) for provenance. Runtime code should import only the files under `assets/audio/`.

## Production assets

### ambience/fortune-room-ambient.mp3
- Source: `soundsforyou-the-ambience-room-tone-139064.mp3`
- Prepared segment: ~5s–35s of the original.
- Loop-safe end crossfade: ~1.75s.
- Purpose: persistent room ambience.
- Starting runtime volume: 0.08–0.12.

### ambience/candle-crackle.mp3
- Source: `creative_spark-crackling-candle-246756.mp3`
- Prepared segment: ~2s–26s.
- Loop-safe end crossfade: ~1.5s.
- Purpose: subtle independent candle layer.
- Starting runtime volume: 0.015–0.035.

### crystal-ball/touch.wav
- Source: `freesound_community-wine-glass-clink-36035.mp3`
- Prepared segment: first ~0.36s, with a short fade-out.
- Purpose: successful hold/touch acknowledgement.
- Starting runtime volume: 0.18–0.28.

### crystal-ball/charging-loop.mp3
- Source: `coghezzi-holy-aura-resonance-magical-energy-loop-533856.mp3`
- Prepared segment: ~1.0s–7.5s.
- Loop-safe end crossfade: ~0.85s.
- Purpose: low ritual charging bed.
- Starting runtime volume curve: 0.00 -> 0.18–0.24 based on ritual progress.

### crystal-ball/peak-shimmer.wav
- Source: `freesound_community-shimmer-glass-81711.mp3`
- Prepared segment: ~0.50s–1.22s, initial silence removed, short fade-out.
- Purpose: single peak accent synchronized with the existing peak/medium haptic.
- Starting runtime volume: 0.28–0.38.

### crystal-ball/reveal-chime.wav
- Source: `freesound_community-crystal-sound-effect-47917.mp3`
- Prepared segment: ~0.12s–1.52s, keeping only the first resonant phrase.
- Purpose: soft prediction reveal accent.
- Starting runtime volume: 0.20–0.30.

## Mixing principle

Peak shimmer should be the clearest one-shot event. Reveal should be softer. Ambient and candle layers should remain below the user's conscious focus. Charging should be perceived mainly because it grows during the ritual, not because it is loud.

Do not multiply file normalization and runtime volume into an inaudible result. Calibrate on a real Android device.

## Source/licensing note

The originals were supplied by the user from Pixabay. Keep the original filenames and a copy of the downloaded source/license information in `art-source` for release records. This pack does not alter or replace the source license.
