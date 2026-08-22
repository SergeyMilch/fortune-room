import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { audioService } from "@/services/audio-service";
import { hapticService } from "@/services/haptic-service";

import { drawRuneSpread } from "./runes-content";

export type RunesPhase =
  | "idle"
  | "mixing"
  | "ready-to-cast"
  | "casting"
  | "scattered"
  | "selecting"
  | "arranging"
  | "completed";

const CAST_MS = 980;
const ARRANGE_MS = 900;

export function useRunesRitual() {
  const [phase, setPhase] = useState<RunesPhase>("idle");
  const [spread, setSpread] = useState(() => drawRuneSpread());
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const phaseRef = useRef<RunesPhase>("idle");
  const mixGestureProgressRef = useRef(0);
  const mixSoundStepRef = useRef(-1);
  const castGestureProgressRef = useRef(0);
  const lockedRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mixProgress = useSharedValue(0);
  const castProgress = useSharedValue(0);

  const updatePhase = useCallback((next: RunesPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const schedule = useCallback((action: () => void, delay: number) => {
    const timer = setTimeout(action, delay);
    timers.current.push(timer);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const beginMix = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "mixing") return;
    if (phaseRef.current === "idle") {
      mixSoundStepRef.current = 0;
      audioService.playRunesBagShake();
      updatePhase("mixing");
    }
  }, [updatePhase]);

  const updateMix = useCallback((progress: number) => {
    if (phaseRef.current !== "mixing") return;
    const bounded = Math.max(0, Math.min(1, progress));
    mixGestureProgressRef.current = bounded;
    mixProgress.value = bounded;
    const soundStep = Math.min(2, Math.floor(bounded * 3));
    if (soundStep > mixSoundStepRef.current) {
      mixSoundStepRef.current = soundStep;
      audioService.playRunesBagShake();
    }
  }, [mixProgress]);

  const endMix = useCallback(() => {
    if (phaseRef.current !== "mixing") return;
    if (mixGestureProgressRef.current >= 0.72) {
      mixProgress.value = withSpring(1, { damping: 15, stiffness: 170 });
      updatePhase("ready-to-cast");
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    mixGestureProgressRef.current = 0;
    mixSoundStepRef.current = -1;
    mixProgress.value = withSpring(0, { damping: 17, stiffness: 180 });
    updatePhase("idle");
  }, [mixProgress, updatePhase]);

  const beginCast = useCallback(() => {
    if (phaseRef.current !== "ready-to-cast") return;
    castGestureProgressRef.current = 0;
  }, []);

  const updateCast = useCallback((progress: number) => {
    if (phaseRef.current !== "ready-to-cast") return;
    castGestureProgressRef.current = Math.max(0, Math.min(1, progress));
  }, []);

  const endCast = useCallback(() => {
    if (phaseRef.current !== "ready-to-cast" || lockedRef.current) return;
    if (castGestureProgressRef.current < 0.58) return;
    lockedRef.current = true;
    updatePhase("casting");
    audioService.playRunesCast();
    castProgress.value = 0;
    castProgress.value = withTiming(1, {
      duration: CAST_MS,
      easing: Easing.bezier(0.16, 0.76, 0.24, 1),
    });
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    schedule(() => {
      lockedRef.current = false;
      updatePhase("scattered");
    }, CAST_MS);
  }, [castProgress, schedule, updatePhase]);

  const selectStone = useCallback((index: number) => {
    if (phaseRef.current !== "scattered" && phaseRef.current !== "selecting") return;
    if (selectedIndexes.includes(index) || selectedIndexes.length >= 3) return;
    const next = [...selectedIndexes, index];
    setSelectedIndexes(next);
    audioService.playRunePick();
    void hapticService.selectionAsync();
    if (next.length < 3) {
      updatePhase("selecting");
      return;
    }
    updatePhase("arranging");
    audioService.playRuneFlip();
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    schedule(() => {
      updatePhase("completed");
      audioService.playRuneReveal();
    }, ARRANGE_MS);
  }, [schedule, selectedIndexes, updatePhase]);

  const resetRitual = useCallback(() => {
    clearTimers();
    lockedRef.current = false;
    mixGestureProgressRef.current = 0;
    mixSoundStepRef.current = -1;
    castGestureProgressRef.current = 0;
    audioService.stopRunesSounds();
    setSpread(drawRuneSpread());
    setSelectedIndexes([]);
    cancelAnimation(mixProgress);
    cancelAnimation(castProgress);
    mixProgress.value = 0;
    castProgress.value = 0;
    updatePhase("idle");
  }, [castProgress, clearTimers, mixProgress, updatePhase]);

  useEffect(() => {
    void audioService.activateRunesContext();
    return () => {
      clearTimers();
      audioService.deactivateRunesContext();
    };
  }, [clearTimers]);

  return {
    phase,
    spread,
    selectedIndexes,
    mixProgress,
    castProgress,
    beginMix,
    updateMix,
    endMix,
    beginCast,
    updateCast,
    endCast,
    selectStone,
    resetRitual,
  };
}
