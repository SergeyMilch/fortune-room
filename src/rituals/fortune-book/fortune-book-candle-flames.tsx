import { useCallback } from "react";
import {
  Atlas,
  Canvas,
  useImage,
  useRectBuffer,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import type { FortuneBookGeometry } from "./fortune-book-geometry";

const flameAtlas = require("../../../assets/crystal-ball/vfx/flame-03-16x4.png");

const atlas = {
  columns: 16,
  frameCount: 64,
  frameWidth: 64,
  frameHeight: 128,
} as const;

const flameBaseAnchor = { x: 31.5, y: 124 } as const;

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
  {
    closedSeatX: 135.5,
    closedSeatY: 195,
    openSeatX: 135,
    openSeatY: 193,
    sourceWidth: 42,
    fps: 10.3,
    delayMs: 0,
  },
  {
    closedSeatX: 850.5,
    closedSeatY: 1195,
    openSeatX: 855.5,
    openSeatY: 1185,
    sourceWidth: 42,
    fps: 9.7,
    delayMs: 310,
  },
] as const;

function getFrame(elapsedMs: number, index: number) {
  "worklet";
  const flame = flames[index];
  const localTime = Math.max(0, elapsedMs - flame.delayMs);
  return Math.floor((localTime / 1000) * flame.fps) % atlas.frameCount;
}

export function FortuneBookCandleFlames({
  geometry,
  openProgress,
}: {
  geometry: FortuneBookGeometry;
  openProgress: SharedValue<number>;
}) {
  const reportError = useCallback((error: Error) => {
    console.error("[FortuneBook/Flame] Failed to load atlas", error);
  }, []);
  const image = useImage(flameAtlas, reportError);
  const elapsedMs = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    "worklet";
    elapsedMs.value += Math.min(frameInfo.timeSincePreviousFrame ?? 0, 50);
  });

  const upperFrame = useDerivedValue(() => getFrame(elapsedMs.value, 0));
  const lowerFrame = useDerivedValue(() => getFrame(elapsedMs.value, 1));
  const sprites = useRectBuffer(flames.length, (sprite, index) => {
    "worklet";
    const frame = index === 0 ? upperFrame.value : lowerFrame.value;
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
    const frame = index === 0 ? upperFrame.value : lowerFrame.value;
    const frameAnchorX = frameBaseCenterX[frame] ?? flameBaseAnchor.x;
    const sourceScale = flame.sourceWidth / atlas.frameWidth;
    const scale = sourceScale * geometry.scale;
    const transition = Math.max(0, Math.min(1, openProgress.value));
    const flameSeatX =
      flame.closedSeatX + (flame.openSeatX - flame.closedSeatX) * transition;
    const flameSeatY =
      flame.closedSeatY + (flame.openSeatY - flame.closedSeatY) * transition;
    const sourceX = flameSeatX - frameAnchorX * sourceScale;
    const sourceY = flameSeatY - flameBaseAnchor.y * sourceScale;
    transform.set(
      scale,
      0,
      sourceX * geometry.scale,
      sourceY * geometry.scale,
    );
  });

  if (!image) return null;

  return (
    <Canvas
      pointerEvents="none"
      style={{
        position: "absolute",
        left: geometry.artwork.left,
        top: geometry.artwork.top,
        width: geometry.artwork.width,
        height: geometry.artwork.height,
      }}
    >
      <Atlas image={image} sprites={sprites} transforms={transforms} opacity={0.92} />
    </Canvas>
  );
}
