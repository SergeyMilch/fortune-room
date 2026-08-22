import { useCallback, useEffect } from "react";
import {
  Atlas,
  useImage,
  useRectBuffer,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import {
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

import type { SphereLayout } from "./crystal-ball-geometry";
import { crystalBallVfx, VFX_DEBUG } from "./crystal-ball-vfx-config";

const wispySmoke03Atlas = require("../../../assets/crystal-ball/vfx/wispy-smoke-03-8x8.png");

export const wispySmoke03Flipbook = {
  atlasWidth: 1024,
  atlasHeight: 1024,
  columns: 8,
  rows: 8,
  frameCount: 64,
  frameWidth: 128,
  frameHeight: 128,
  idleFps: 11,
  chargingFps: 14,
} as const;

type WispySmokeFlipbookProps = {
  sphere: SphereLayout;
  touch: SharedValue<number>;
  ritual: SharedValue<number>;
  prediction: SharedValue<number>;
};

export function WispySmokeFlipbook({
  sphere,
  touch,
  ritual,
  prediction,
}: WispySmokeFlipbookProps) {
  const reportAtlasError = useCallback((error: Error) => {
    console.error("[CrystalBall/WispySmoke03] Failed to load atlas", error);
  }, []);
  const atlas = useImage(wispySmoke03Atlas, reportAtlasError);
  const framePhase = useSharedValue(0);

  useEffect(() => {
    if (VFX_DEBUG && atlas) {
      console.info(
        `[CrystalBall/WispySmoke03] Atlas loaded: ${atlas.width()}x${atlas.height()}`,
      );
    }
  }, [atlas]);

  useFrameCallback((frameInfo) => {
    "worklet";
    const activity = ritual.value * (1 - prediction.value * 0.6);
    const fps =
      wispySmoke03Flipbook.idleFps +
      (wispySmoke03Flipbook.chargingFps - wispySmoke03Flipbook.idleFps) * activity;
    const deltaMs = Math.min(frameInfo.timeSincePreviousFrame ?? 0, 50);
    framePhase.value =
      (framePhase.value + (deltaMs / 1000) * fps) % wispySmoke03Flipbook.frameCount;
  });

  const frameIndex = useDerivedValue(
    () => Math.floor(framePhase.value) % wispySmoke03Flipbook.frameCount,
  );
  const targetSize = sphere.diameter * 0.93;
  const targetLeft = (sphere.diameter - targetSize) / 2;
  const targetTop = (sphere.diameter - targetSize) / 2 + sphere.diameter * 0.025;
  const sprites = useRectBuffer(1, (sprite) => {
    "worklet";
    const column = frameIndex.value % wispySmoke03Flipbook.columns;
    const row = Math.floor(frameIndex.value / wispySmoke03Flipbook.columns);
    sprite.setXYWH(
      column * wispySmoke03Flipbook.frameWidth,
      row * wispySmoke03Flipbook.frameHeight,
      wispySmoke03Flipbook.frameWidth,
      wispySmoke03Flipbook.frameHeight,
    );
  });
  const transforms = useRSXformBuffer(1, (transform) => {
    "worklet";
    const uniformScale = targetSize / wispySmoke03Flipbook.frameWidth;
    transform.set(uniformScale, 0, targetLeft, targetTop);
  });
  const opacity = useDerivedValue(() => {
    const charging =
      crystalBallVfx.wispySmokeIdle +
      (crystalBallVfx.wispySmokeCharging - crystalBallVfx.wispySmokeIdle) * ritual.value;
    const touchFloor =
      crystalBallVfx.wispySmokeIdle +
      (crystalBallVfx.wispySmokeTouch - crystalBallVfx.wispySmokeIdle) * touch.value;
    const active = Math.max(charging, touchFloor);
    const peak =
      Math.max(0, Math.min(1, (ritual.value - 0.72) / 0.28)) *
      (1 - prediction.value);
    const withPeak = active + (crystalBallVfx.wispySmokePeak - active) * peak;

    return (
      withPeak * (1 - prediction.value) +
      crystalBallVfx.wispySmokeResult * prediction.value
    );
  });

  if (!atlas) return null;

  return (
    <Atlas
      image={atlas}
      sprites={sprites}
      transforms={transforms}
      opacity={opacity}
    />
  );
}
