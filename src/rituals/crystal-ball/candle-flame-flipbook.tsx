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
} from "react-native-reanimated";

import type { CrystalBallGeometry } from "./crystal-ball-geometry";

const flame03Atlas = require("../../../assets/crystal-ball/vfx/flame-03-16x4.png");

const flame03 = {
  columns: 16,
  frameCount: 64,
  frameWidth: 64,
  frameHeight: 128,
  loopStart: 0,
  loopEnd: 63,
} as const;

const flames = [
  {
    sourceX: 48,
    sourceY: 1039,
    sourceWidth: 42,
    fps: 10.5,
    delayMs: 0,
    phaseOffset: 0,
  },
  {
    sourceX: 831,
    sourceY: 970,
    sourceWidth: 42,
    fps: 9.8,
    delayMs: 280,
    phaseOffset: 0,
  },
] as const;

function getLoopedFrame(elapsedMs: number, flameIndex: number) {
  "worklet";
  const flame = flames[flameIndex];
  if (elapsedMs < flame.delayMs) {
    return 0;
  }

  const rawFrame =
    flame.phaseOffset + ((elapsedMs - flame.delayMs) / 1000) * flame.fps;
  if (rawFrame <= flame03.loopEnd) {
    return Math.floor(rawFrame);
  }

  const loopLength = flame03.loopEnd - flame03.loopStart + 1;
  return flame03.loopStart + Math.floor(rawFrame - flame03.loopStart) % loopLength;
}

export function CandleFlameFlipbook({ geometry }: { geometry: CrystalBallGeometry }) {
  const reportAtlasError = useCallback((error: Error) => {
    console.error("[CrystalBall/Flame03] Failed to load atlas", error);
  }, []);
  const atlas = useImage(flame03Atlas, reportAtlasError);
  const elapsedMs = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    "worklet";
    elapsedMs.value += Math.min(frameInfo.timeSincePreviousFrame ?? 0, 50);
  });

  const leftFrame = useDerivedValue(() => getLoopedFrame(elapsedMs.value, 0));
  const rightFrame = useDerivedValue(() => getLoopedFrame(elapsedMs.value, 1));
  const sprites = useRectBuffer(flames.length, (sprite, index) => {
    "worklet";
    const frameIndex = index === 0 ? leftFrame.value : rightFrame.value;
    const column = frameIndex % flame03.columns;
    const row = Math.floor(frameIndex / flame03.columns);
    sprite.setXYWH(
      column * flame03.frameWidth,
      row * flame03.frameHeight,
      flame03.frameWidth,
      flame03.frameHeight,
    );
  });
  const transforms = useRSXformBuffer(flames.length, (transform, index) => {
    "worklet";
    const flame = flames[index];
    const scale = (flame.sourceWidth * geometry.scale) / flame03.frameWidth;
    transform.set(
      scale,
      0,
      geometry.artwork.left + flame.sourceX * geometry.scale,
      geometry.artwork.top + flame.sourceY * geometry.scale,
    );
  });

  if (!atlas) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      <Atlas
        image={atlas}
        sprites={sprites}
        transforms={transforms}
        opacity={0.94}
      />
    </Canvas>
  );
}
