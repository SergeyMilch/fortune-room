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

import { drawCoinOutcome, drawCoinReading, type CoinOutcome } from "./coin-content";
import { getCoinThrowProfile, type CoinFlickInput } from "./coin-physics";

export type FortuneCoinPhase =
  | "idle"
  | "touch"
  | "charge"
  | "airborne"
  | "bouncing"
  | "settling"
  | "reveal"
  | "completed";

const CHARGE_MS = 420;

export function useFortuneCoinRitual() {
  const [phase, setPhase] = useState<FortuneCoinPhase>("idle");
  const [charged, setCharged] = useState(false);
  const [outcome, setOutcome] = useState<CoinOutcome | null>(null);
  const [reading, setReading] = useState("");
  const phaseRef = useRef<FortuneCoinPhase>("idle");
  const chargedRef = useRef(false);
  const lockedRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const charge = useSharedValue(0);
  const motion = useSharedValue(0);
  const reveal = useSharedValue(0);
  const throwHeight = useSharedValue(360);
  const turns = useSharedValue(5);
  const driftX = useSharedValue(0);
  const targetFace = useSharedValue(0);

  const updatePhase = useCallback((next: FortuneCoinPhase) => {
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

  const returnToIdle = useCallback(() => {
    clearTimers();
    chargedRef.current = false;
    setCharged(false);
    charge.value = withSpring(0, { damping: 18, stiffness: 190 });
    updatePhase("idle");
  }, [charge, clearTimers, updatePhase]);

  const beginTouch = useCallback(() => {
    if (phaseRef.current !== "idle" || lockedRef.current) return;
    clearTimers();
    chargedRef.current = false;
    setCharged(false);
    updatePhase("touch");
    charge.value = 0;
    charge.value = withTiming(1, {
      duration: CHARGE_MS,
      easing: Easing.out(Easing.cubic),
    });
    void hapticService.selectionAsync();
    schedule(() => {
      if (phaseRef.current !== "touch" && phaseRef.current !== "charge") return;
      chargedRef.current = true;
      setCharged(true);
      updatePhase("charge");
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, CHARGE_MS);
  }, [charge, clearTimers, schedule, updatePhase]);

  const releaseCoin = useCallback((input: CoinFlickInput) => {
    if (phaseRef.current !== "touch" && phaseRef.current !== "charge") return;
    const profile = getCoinThrowProfile(input);
    if (!chargedRef.current || !profile.valid) {
      returnToIdle();
      return;
    }

    lockedRef.current = true;
    clearTimers();
    const nextOutcome = drawCoinOutcome();
    setOutcome(nextOutcome);
    setReading(drawCoinReading(nextOutcome));
    targetFace.value = nextOutcome === "sun" ? 0 : 1;
    throwHeight.value = profile.throwHeight;
    turns.value = profile.turns;
    driftX.value = profile.driftX;
    charge.value = 1;
    motion.value = 0;
    reveal.value = 0;
    updatePhase("airborne");
    audioService.playFortuneCoinFlip();
    motion.value = withTiming(1, {
      duration: profile.durationMs,
      easing: Easing.linear,
    });
    void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const firstImpactMs = Math.round(profile.durationMs * 0.47);
    schedule(() => {
      updatePhase("bouncing");
      audioService.playFortuneCoinLand();
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, firstImpactMs);
    schedule(() => {
      void hapticService.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, firstImpactMs + 300);
    schedule(() => updatePhase("settling"), firstImpactMs + 760);
    schedule(() => {
      updatePhase("reveal");
      reveal.value = withTiming(1, {
        duration: 480,
        easing: Easing.bezier(0.2, 0.72, 0.2, 1),
      });
      void hapticService.selectionAsync();
    }, profile.durationMs + 100);
    schedule(() => {
      lockedRef.current = false;
      updatePhase("completed");
    }, profile.durationMs + 580);
  }, [charge, clearTimers, driftX, motion, returnToIdle, reveal, schedule, targetFace, throwHeight, turns, updatePhase]);

  const resetRitual = useCallback(() => {
    clearTimers();
    audioService.stopFortuneCoinSounds();
    lockedRef.current = false;
    chargedRef.current = false;
    setCharged(false);
    setOutcome(null);
    setReading("");
    [charge, motion, reveal].forEach((value) => {
      cancelAnimation(value);
      value.value = 0;
    });
    driftX.value = 0;
    targetFace.value = 0;
    updatePhase("idle");
  }, [charge, clearTimers, driftX, motion, reveal, targetFace, updatePhase]);

  useEffect(() => {
    void audioService.activateFortuneCoinContext();
    return () => {
      clearTimers();
      audioService.deactivateFortuneCoinContext();
    };
  }, [clearTimers]);

  return {
    phase,
    charged,
    outcome,
    reading,
    charge,
    motion,
    reveal,
    throwHeight,
    turns,
    driftX,
    targetFace,
    beginTouch,
    releaseCoin,
    resetRitual,
  };
}
