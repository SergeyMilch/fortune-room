import { useCallback } from "react";
import { Atlas, Canvas, useImage, useRectBuffer, useRSXformBuffer } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";

import type { HomeGeometry } from "./fortune-room-home-geometry";

const flameAtlas = require("../../assets/crystal-ball/vfx/flame-03-16x4.png");

const atlas = {
  columns: 16,
  frameCount: 64,
  frameWidth: 64,
  frameHeight: 128,
} as const;

// Measured from the atlas: the stable center of the flame base is x=31.5,
// and its last visible row is y=124. Each home coordinate below is the point
// on the real wick where that base must land, matching the Crystal Ball scene.
const flameBaseAnchor = { x: 31.5, y: 124 } as const;

// Bright-base centroid measured independently for every atlas frame. The raw
// atlas drifts by more than 11 px across its loop, so a fixed x anchor makes
// the flame appear to jump off the wick even when the sprite rect is correct.
const frameBaseCenterX = [
  32.73, 32.98, 33.28, 33.68, 34.14, 34.63, 35.12, 35.53,
  35.91, 36.28, 36.64, 36.96, 37.19, 37.3, 37.26, 37.13,
  36.94, 36.64, 36.2, 35.72, 35.19, 34.65, 34.03, 33.29,
  32.44, 31.62, 30.92, 30.34, 29.9, 29.57, 29.33, 29.09,
  28.85, 28.63, 28.36, 28.03, 27.64, 27.27, 26.96, 26.73,
  26.52, 26.31, 26.12, 26.02, 26.08, 26.21, 26.36, 26.57,
  26.87, 27.23, 27.62, 28.06, 28.47, 28.92, 29.36, 29.8,
  30.21, 30.59, 30.92, 31.29, 31.65, 31.97, 32.25, 32.51,
] as const;

const flames = [
  { flameSeatX: 184, flameSeatY: 806, sourceWidth: 42, fps: 10.4, delayMs: 0 },
  { flameSeatX: 799, flameSeatY: 884, sourceWidth: 42, fps: 9.8, delayMs: 310 },
  { flameSeatX: 235, flameSeatY: 584, sourceWidth: 20, fps: 9.1, delayMs: 170 },
] as const;

function getFrame(elapsedMs: number, index: number) {
  "worklet";
  const flame = flames[index];
  const localTime = Math.max(0, elapsedMs - flame.delayMs);
  return Math.floor((localTime / 1000) * flame.fps) % atlas.frameCount;
}

export function HomeCandleFlameFlipbook({ geometry }: { geometry: HomeGeometry }) {
  const reportError = useCallback((error: Error) => {
    console.error("[Home/Flame] Failed to load atlas", error);
  }, []);
  const image = useImage(flameAtlas, reportError);
  const elapsedMs = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    "worklet";
    elapsedMs.value += Math.min(frameInfo.timeSincePreviousFrame ?? 0, 50);
  });

  const leftFrame = useDerivedValue(() => getFrame(elapsedMs.value, 0));
  const rightFrame = useDerivedValue(() => getFrame(elapsedMs.value, 1));
  const shelfFrame = useDerivedValue(() => getFrame(elapsedMs.value, 2));
  const sprites = useRectBuffer(flames.length, (sprite, index) => {
    "worklet";
    const frame = index === 0 ? leftFrame.value : index === 1 ? rightFrame.value : shelfFrame.value;
    sprite.setXYWH(
      (frame % atlas.columns) * atlas.frameWidth,
      Math.floor(frame / atlas.columns) * atlas.frameHeight,
      atlas.frameWidth,
      atlas.frameHeight,
    );
  });
  const transforms = useRSXformBuffer(flames.length, (transform, index) => {
    "worklet";
    const flame = flames[index];
    const frame = index === 0 ? leftFrame.value : index === 1 ? rightFrame.value : shelfFrame.value;
    const frameAnchorX = frameBaseCenterX[frame] ?? flameBaseAnchor.x;
    const sourceScale = flame.sourceWidth / atlas.frameWidth;
    const scale = sourceScale * geometry.scale;
    const sourceX = flame.flameSeatX - frameAnchorX * sourceScale;
    const sourceY = flame.flameSeatY - flameBaseAnchor.y * sourceScale;
    transform.set(
      scale,
      0,
      geometry.artwork.left + sourceX * geometry.scale,
      geometry.artwork.top + sourceY * geometry.scale,
    );
  });

  if (!image) return null;

  return (
    <Canvas pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      <Atlas image={image} sprites={sprites} transforms={transforms} opacity={0.9} />
    </Canvas>
  );
}
