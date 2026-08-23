import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { hapticService } from "@/services/haptic-service";
import { audioService } from "@/services/audio-service";
import { rustoreReleaseService } from "@/services/rustore-release-service";

import {
  fortuneCookieContentService,
  type FortuneCookieEntry,
} from "./content/fortune-cookie-content-service";

export type FortuneCookiePhase =
  | "idle"
  | "cookie-selected"
  | "ready-to-break"
  | "breaking"
  | "broken"
  | "paper-pulling"
  | "paper-revealed"
  | "completed";

const timing = {
  selectionMs: 680,
  breakSettleMs: 420,
  paperRevealMs: 720,
} as const;

export function useFortuneCookieRitual() {
  const [phase, setPhase] = useState<FortuneCookiePhase>("idle");
  const [selectedCookie, setSelectedCookie] = useState<number | null>(null);
  const [entry, setEntry] = useState<FortuneCookieEntry | null>(null);
  const phaseRef = useRef<FortuneCookiePhase>("idle");
  const selectionLockedRef = useRef(false);
  const breakLockedRef = useRef(false);
  const paperLockedRef = useRef(false);
  const stretchTickRef = useRef(0);
  const ritualTokenRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const selectionProgress = useSharedValue(0);
  const breakProgress = useSharedValue(0);
  const crumbProgress = useSharedValue(0);
  const pullProgress = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const hintProgress = useSharedValue(0);

  const updatePhase = useCallback((next: FortuneCookiePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const schedule = useCallback((action: () => void, delayMs: number) => {
    const timer = setTimeout(action, delayMs);
    timers.current.push(timer);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const selectCookie = useCallback((index: number) => {
    if (phaseRef.current !== "idle" || selectionLockedRef.current) return;
    selectionLockedRef.current = true;
    const token = ++ritualTokenRef.current;
    const startedAt = Date.now();
    setSelectedCookie(index);
    updatePhase("cookie-selected");
    selectionProgress.value = withTiming(1, {
      duration: timing.selectionMs,
      easing: Easing.bezier(0.18, 0.72, 0.22, 1),
    });
    void hapticService.selectionAsync();

    void fortuneCookieContentService.consumeNext().then((nextEntry) => {
      if (ritualTokenRef.current !== token) return;
      setEntry(nextEntry);
      const remaining = Math.max(0, timing.selectionMs - (Date.now() - startedAt));
      schedule(() => {
        if (ritualTokenRef.current !== token) return;
        updatePhase("ready-to-break");
        hintProgress.value = 0;
        hintProgress.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 760, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 1 }),
          ),
          2,
          false,
        );
      }, remaining);
    }).catch((error: unknown) => {
      console.error("Failed to consume Fortune Cookie prediction", error);
      if (ritualTokenRef.current === token) {
        selectionLockedRef.current = false;
        setSelectedCookie(null);
        selectionProgress.value = withTiming(0, { duration: 180 });
        updatePhase("idle");
      }
    });
  }, [hintProgress, schedule, selectionProgress, updatePhase]);

  const beginBreaking = useCallback(() => {
    if (phaseRef.current !== "ready-to-break" && phaseRef.current !== "breaking") return;
    if (phaseRef.current === "ready-to-break") updatePhase("breaking");
  }, [updatePhase]);

  const updateBreaking = useCallback((progress: number) => {
    if (phaseRef.current !== "breaking" || breakLockedRef.current) return;
    const bounded = Math.max(0, Math.min(1, progress));
    breakProgress.value = bounded;
    const tick = bounded >= 0.72 ? 2 : bounded >= 0.38 ? 1 : 0;
    if (tick > stretchTickRef.current) {
      stretchTickRef.current = tick;
      void hapticService.selectionAsync();
    }
    if (bounded < 1) return;

    breakLockedRef.current = true;
    updatePhase("broken");
    cancelAnimation(hintProgress);
    hintProgress.value = 0;
    breakProgress.value = 0.55;
    breakProgress.value = withSpring(1, { damping: 13, stiffness: 170, mass: 0.45 });
    crumbProgress.value = 0;
    crumbProgress.value = withTiming(1, {
      duration: timing.breakSettleMs,
      easing: Easing.out(Easing.cubic),
    });
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    audioService.playFortuneCookieBreak();
  }, [breakProgress, crumbProgress, hintProgress, updatePhase]);

  const endBreaking = useCallback(() => {
    if (phaseRef.current !== "breaking" || breakLockedRef.current) return;
    stretchTickRef.current = 0;
    breakProgress.value = withSpring(0, { damping: 16, stiffness: 180 });
    updatePhase("ready-to-break");
  }, [breakProgress, updatePhase]);

  const beginPaperPull = useCallback(() => {
    if (phaseRef.current !== "broken" && phaseRef.current !== "paper-pulling") return;
    if (phaseRef.current === "broken") updatePhase("paper-pulling");
  }, [updatePhase]);

  const updatePaperPull = useCallback((progress: number) => {
    if (phaseRef.current !== "paper-pulling" || paperLockedRef.current) return;
    const bounded = Math.max(0, Math.min(1, progress));
    pullProgress.value = bounded;
    if (bounded < 1) return;

    paperLockedRef.current = true;
    updatePhase("paper-revealed");
    revealProgress.value = withTiming(1, {
      duration: timing.paperRevealMs,
      easing: Easing.bezier(0.2, 0.72, 0.2, 1),
    });
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    schedule(() => {
      updatePhase("completed");
      void rustoreReleaseService.recordCompletedRitual();
    }, timing.paperRevealMs);
  }, [pullProgress, revealProgress, schedule, updatePhase]);

  const endPaperPull = useCallback(() => {
    if (phaseRef.current !== "paper-pulling" || paperLockedRef.current) return;
    pullProgress.value = withSpring(0, { damping: 17, stiffness: 190 });
    updatePhase("broken");
  }, [pullProgress, updatePhase]);

  const resetRitual = useCallback(() => {
    clearTimers();
    ritualTokenRef.current += 1;
    selectionLockedRef.current = false;
    breakLockedRef.current = false;
    paperLockedRef.current = false;
    stretchTickRef.current = 0;
    setSelectedCookie(null);
    setEntry(null);
    [selectionProgress, breakProgress, crumbProgress, pullProgress, revealProgress, hintProgress]
      .forEach((value) => {
        cancelAnimation(value);
        value.value = 0;
      });
    updatePhase("idle");
  }, [breakProgress, clearTimers, crumbProgress, hintProgress, pullProgress, revealProgress, selectionProgress, updatePhase]);

  useEffect(() => {
    void fortuneCookieContentService.prepare().catch((error: unknown) => {
      console.error("Failed to prepare Fortune Cookie content", error);
    });
    return () => {
      ritualTokenRef.current += 1;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    phase,
    selectedCookie,
    entry,
    selectionProgress,
    breakProgress,
    crumbProgress,
    pullProgress,
    revealProgress,
    hintProgress,
    selectCookie,
    beginBreaking,
    updateBreaking,
    endBreaking,
    beginPaperPull,
    updatePaperPull,
    endPaperPull,
    resetRitual,
  };
}
