import { useCallback } from "react";
import {
  Atlas,
  Canvas,
  useImage,
  useRectBuffer,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";

import type { FortuneCoinGeometry } from "./fortune-coin-geometry";

const flameAtlas = require("../../../assets/crystal-ball/vfx/flame-03-16x4.png");

const atlas = { columns: 16, frameCount: 64, frameWidth: 64, frameHeight: 128 } as const;
const flame = { seatX: 103, seatY: 151, sourceWidth: 43, fps: 10.1 } as const;
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

export function FortuneCoinCandleFlame({ geometry }: { geometry: FortuneCoinGeometry }) {
  const reportError = useCallback((error: Error) => {
    console.error("[FortuneCoin/Flame] Failed to load atlas", error);
  }, []);
  const image = useImage(flameAtlas, reportError);
  const elapsedMs = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    "worklet";
    elapsedMs.value += Math.min(frameInfo.timeSincePreviousFrame ?? 0, 50);
  });

  const frame = useDerivedValue(
    () => Math.floor((elapsedMs.value / 1000) * flame.fps) % atlas.frameCount,
  );
  const sprites = useRectBuffer(1, (sprite) => {
    "worklet";
    sprite.setXYWH(
      (frame.value % atlas.columns) * atlas.frameWidth,
      Math.floor(frame.value / atlas.columns) * atlas.frameHeight,
      atlas.frameWidth,
      atlas.frameHeight,
    );
  });
  const transforms = useRSXformBuffer(1, (transform) => {
    "worklet";
    const frameAnchorX = frameBaseCenterX[frame.value] ?? flameBaseAnchor.x;
    const sourceScale = flame.sourceWidth / atlas.frameWidth;
    transform.set(
      sourceScale * geometry.scale,
      0,
      geometry.artwork.left + (flame.seatX - frameAnchorX * sourceScale) * geometry.scale,
      geometry.artwork.top + (flame.seatY - flameBaseAnchor.y * sourceScale) * geometry.scale,
    );
  });

  if (!image) return null;
  return (
    <Canvas pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      <Atlas image={image} sprites={sprites} transforms={transforms} opacity={0.94} />
    </Canvas>
  );
}
