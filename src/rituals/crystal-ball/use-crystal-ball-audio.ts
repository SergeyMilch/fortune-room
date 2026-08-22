import { useEffect } from "react";
import { runOnJS, type SharedValue, useAnimatedReaction } from "react-native-reanimated";

import { audioService } from "@/services/audio-service";

const CHARGING_PROGRESS_STEPS = 24;

function updateChargingProgress(progress: number) {
  audioService.updateChargingProgress(progress);
}

export function useCrystalBallAudio(
  ritual: SharedValue<number>,
  prediction: SharedValue<number>,
) {
  useEffect(() => {
    void audioService.activateCrystalBallContext();
    return () => audioService.deactivateCrystalBallContext();
  }, []);

  useAnimatedReaction(
    () => {
      const chargingProgress = Math.max(0, Math.min(1, ritual.value * (1 - prediction.value)));
      return Math.round(chargingProgress * CHARGING_PROGRESS_STEPS) / CHARGING_PROGRESS_STEPS;
    },
    (chargingProgress, previousProgress) => {
      if (chargingProgress !== previousProgress) {
        runOnJS(updateChargingProgress)(chargingProgress);
      }
    },
    [prediction, ritual],
  );
}
