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

import {
  fortuneBookContentService,
  type FortuneBookEntry,
} from "./fortune-book-content";

export type FortuneBookPhase =
  | "closed"
  | "opening"
  | "flipping"
  | "stopping"
  | "pageReady"
  | "lineSelected"
  | "revealing"
  | "result";

const timing = {
  openingMs: 780,
  stopAvailableMs: 380,
  stoppingMs: 1540,
  selectionPauseMs: 440,
  revealMs: 680,
} as const;

export function useFortuneBookRitual() {
  const [phase, setPhase] = useState<FortuneBookPhase>("closed");
  const [stopAvailable, setStopAvailable] = useState(false);
  const [entries, setEntries] = useState<FortuneBookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<FortuneBookEntry | null>(null);
  const phaseRef = useRef<FortuneBookPhase>("closed");
  const selectionLockedRef = useRef(false);
  const ritualTokenRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const openProgress = useSharedValue(0);
  const pageTurn = useSharedValue(0);
  const linesProgress = useSharedValue(0);
  const selectionProgress = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const settle = useSharedValue(0);

  const selectedId = selectedEntry?.id ?? null;

  const updatePhase = useCallback((next: FortuneBookPhase) => {
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

  const startRitual = useCallback(() => {
    if (phaseRef.current !== "closed") return;

    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePhase("opening");
    openProgress.value = withTiming(1, {
      duration: timing.openingMs,
      easing: Easing.bezier(0.2, 0.72, 0.22, 1),
    });

    schedule(() => {
      updatePhase("flipping");
      pageTurn.value = 0;
      pageTurn.value = withRepeat(
        withTiming(1, { duration: 560, easing: Easing.linear }),
        -1,
        false,
      );
      const playNextPageTurn = () => {
        if (phaseRef.current !== "flipping") return;
        audioService.playFortuneBookPageTurn();
        schedule(playNextPageTurn, 560);
      };
      schedule(playNextPageTurn, 280);
      schedule(() => setStopAvailable(true), timing.stopAvailableMs);
    }, timing.openingMs);
  }, [openProgress, pageTurn, schedule, updatePhase]);

  const stopFlipping = useCallback(() => {
    if (phaseRef.current !== "flipping" || !stopAvailable) return;

    clearTimers();
    const ritualToken = ++ritualTokenRef.current;
    const spreadPromise = fortuneBookContentService.createNextSpread();
    setStopAvailable(false);
    updatePhase("stopping");
    cancelAnimation(pageTurn);
    pageTurn.value = 0;
    pageTurn.value = withSequence(
      withTiming(1, { duration: 360, easing: Easing.linear }),
      withTiming(0, { duration: 1 }),
      withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1 }),
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
    settle.value = withSequence(
      withTiming(-1, { duration: 1020 }),
      withSpring(0, { damping: 15, stiffness: 130, mass: 0.55 }),
    );

    schedule(() => audioService.playFortuneBookPageTurn(), 180);
    schedule(() => audioService.playFortuneBookPageTurn(), 601);
    schedule(() => audioService.playFortuneBookPageTurn(), 1167);

    schedule(() => {
      void spreadPromise.then((spread) => {
        if (ritualTokenRef.current !== ritualToken || phaseRef.current !== "stopping") return;
        setEntries(spread.entries);
        pageTurn.value = 0;
        updatePhase("pageReady");
        linesProgress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
        void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }).catch((error: unknown) => {
        console.error("Failed to create Fortune Book spread", error);
        if (ritualTokenRef.current === ritualToken) updatePhase("closed");
      });
    }, timing.stoppingMs);
  }, [clearTimers, linesProgress, pageTurn, schedule, settle, stopAvailable, updatePhase]);

  const selectLine = useCallback((id: string) => {
    if (phaseRef.current !== "pageReady" || selectionLockedRef.current) return;
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) return;

    selectionLockedRef.current = true;
    setSelectedEntry(entry);
    fortuneBookContentService.setSelectedForDiagnostics(entry.id);
    updatePhase("lineSelected");
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectionProgress.value = withTiming(1, {
      duration: timing.selectionPauseMs,
      easing: Easing.out(Easing.quad),
    });

    schedule(() => {
      updatePhase("revealing");
      revealProgress.value = withTiming(1, {
        duration: timing.revealMs,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      });
      schedule(() => {
        updatePhase("result");
        void hapticService.selectionAsync();
      }, timing.revealMs);
    }, timing.selectionPauseMs);
  }, [entries, revealProgress, schedule, selectionProgress, updatePhase]);

  const resetRitual = useCallback(() => {
    clearTimers();
    cancelAnimation(openProgress);
    cancelAnimation(pageTurn);
    cancelAnimation(linesProgress);
    cancelAnimation(selectionProgress);
    cancelAnimation(revealProgress);
    cancelAnimation(settle);
    openProgress.value = 0;
    pageTurn.value = 0;
    linesProgress.value = 0;
    selectionProgress.value = 0;
    revealProgress.value = 0;
    settle.value = 0;
    ritualTokenRef.current += 1;
    selectionLockedRef.current = false;
    setEntries([]);
    setSelectedEntry(null);
    fortuneBookContentService.setSelectedForDiagnostics(null);
    audioService.stopFortuneBookPageTurns();
    setStopAvailable(false);
    updatePhase("closed");
  }, [clearTimers, linesProgress, openProgress, pageTurn, revealProgress, selectionProgress, settle, updatePhase]);

  useEffect(() => {
    void audioService.activateFortuneBookContext();
    void fortuneBookContentService.initialize().catch((error: unknown) => {
      console.error("Failed to initialize Fortune Book content", error);
    });
    return () => {
      ritualTokenRef.current += 1;
      clearTimers();
      audioService.deactivateFortuneBookContext();
      cancelAnimation(openProgress);
      cancelAnimation(pageTurn);
    };
  }, [clearTimers, openProgress, pageTurn]);

  return {
    phase,
    stopAvailable,
    entries,
    selectedId,
    selectedEntry,
    openProgress,
    pageTurn,
    linesProgress,
    selectionProgress,
    revealProgress,
    settle,
    startRitual,
    stopFlipping,
    selectLine,
    resetRitual,
  };
}
