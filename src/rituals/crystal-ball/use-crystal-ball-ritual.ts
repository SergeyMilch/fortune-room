import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  Easing,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { audioService } from "@/services/audio-service";
import { hapticService } from "@/services/haptic-service";
import { rustoreReleaseService } from "@/services/rustore-release-service";

import {
  crystalBallPredictionService,
  type PredictionEntry,
} from "./crystal-ball-prediction-service";
import { ritualDurationMs, ritualTiming } from "./ritual-timing";

export type RitualPhase = "idle" | "holding" | "focusing" | "revealing" | "revealed";

const softCurve = Easing.bezier(0.22, 0.72, 0.24, 1);

export function useCrystalBallRitual() {
  const [phase, setPhase] = useState<RitualPhase>("idle");
  const [currentPrediction, setCurrentPrediction] = useState<PredictionEntry | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<RitualPhase>("idle");
  const ritualAttemptRef = useRef(0);

  const touch = useSharedValue(0);
  const ritual = useSharedValue(0);
  const prediction = useSharedValue(0);

  const updatePhase = useCallback((next: RitualPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const beginRitual = useCallback(() => {
    const ritualAttempt = ritualAttemptRef.current;
    updatePhase("focusing");
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    audioService.onValidHoldBegin();
    void crystalBallPredictionService.reservePrediction().then((reservedPrediction) => {
      if (ritualAttempt === ritualAttemptRef.current) {
        setCurrentPrediction(reservedPrediction);
      }
    });

    ritual.value = withSequence(
      withTiming(0.38, { duration: ritualTiming.focusMs, easing: softCurve }),
      withTiming(1, { duration: ritualTiming.gatherMs, easing: softCurve }),
      withTiming(0.68, { duration: ritualTiming.revealMs, easing: softCurve }),
    );
    prediction.value = withDelay(
      ritualTiming.focusMs + ritualTiming.gatherMs - 100,
      withTiming(1, { duration: ritualTiming.revealMs, easing: softCurve }),
    );

    revealTimer.current = setTimeout(() => {
      updatePhase("revealing");
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      audioService.onPeak();
      audioService.onReveal();
      void crystalBallPredictionService.commitReservedPrediction();
    }, ritualTiming.focusMs + ritualTiming.gatherMs - 100);

    settleTimer.current = setTimeout(() => {
      updatePhase("revealed");
      void hapticService.selectionAsync();
      void rustoreReleaseService.recordCompletedRitual();
    }, ritualDurationMs);
  }, [prediction, ritual, updatePhase]);

  const onPressIn = useCallback(() => {
    if (phaseRef.current === "focusing" || phaseRef.current === "revealing") return;

    clearTimers();
    audioService.resetRitual();
    void crystalBallPredictionService.abortReservedPrediction();
    ritualAttemptRef.current += 1;
    setCurrentPrediction(null);
    prediction.value = 0;
    ritual.value = withTiming(0, { duration: 260 });
    touch.value = withSpring(1, { damping: 18, stiffness: 150 });
    updatePhase("holding");
    holdTimer.current = setTimeout(beginRitual, ritualTiming.holdToBeginMs);
  }, [beginRitual, clearTimers, prediction, ritual, touch, updatePhase]);

  const onPressOut = useCallback(() => {
    touch.value = withSpring(0, { damping: 18, stiffness: 170 });
    if (phaseRef.current !== "holding") return;

    clearTimers();
    audioService.resetRitual();
    void crystalBallPredictionService.abortReservedPrediction();
    ritualAttemptRef.current += 1;
    updatePhase("idle");
  }, [clearTimers, touch, updatePhase]);

  useEffect(() => {
    void crystalBallPredictionService.prepare();
    return () => {
      clearTimers();
      ritualAttemptRef.current += 1;
      void crystalBallPredictionService.abortReservedPrediction();
    };
  }, [clearTimers]);

  return { phase, currentPrediction, touch, ritual, prediction, onPressIn, onPressOut };
}
