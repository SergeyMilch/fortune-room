import { useCallback, useRef, useState } from "react";

import { dailyRitualAccessService } from "./daily-ritual-access-service";
import type { RitualId } from "./ritual-access";
import { yandexRewardedService, type RewardedShowResult } from "./yandex-rewarded-service";

type PendingAttempt = {
  begin: () => void;
  resumeAfterReward: boolean;
};

function getFailureMessage(result: RewardedShowResult) {
  if (result === "dismissed") {
    return "Награда не получена. Посмотрите рекламу до конца, чтобы открыть ещё одно гадание.";
  }
  if (result === "busy") return "Реклама уже открывается. Подождите немного.";
  return "Реклама сейчас недоступна. Проверьте подключение и попробуйте снова.";
}

export function useRitualRewardedAccess(ritualId: RitualId) {
  const activeAttemptRef = useRef(false);
  const activeAttemptAccessRef = useRef<"free" | "reward" | null>(null);
  const showingAdRef = useRef(false);
  const pendingAttemptRef = useRef<PendingAttempt | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [showingAd, setShowingAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const beginAttempt = useCallback((begin: () => void, resumeAfterReward = true) => {
    if (activeAttemptRef.current) {
      begin();
      return true;
    }
    const access = dailyRitualAccessService.beginAttempt(ritualId);
    if (access !== "reward-required") {
      activeAttemptRef.current = true;
      activeAttemptAccessRef.current = access;
      begin();
      return true;
    }
    pendingAttemptRef.current = { begin, resumeAfterReward };
    setErrorMessage(null);
    setPromptVisible(true);
    return false;
  }, [ritualId]);

  const recordResult = useCallback(() => {
    if (activeAttemptAccessRef.current === "free") {
      dailyRitualAccessService.recordResult(ritualId);
    }
    activeAttemptRef.current = false;
    activeAttemptAccessRef.current = null;
  }, [ritualId]);

  const dismissPrompt = useCallback(() => {
    if (showingAd) return;
    pendingAttemptRef.current = null;
    setErrorMessage(null);
    setPromptVisible(false);
  }, [showingAd]);

  const watchAd = useCallback(async () => {
    if (showingAdRef.current) return;
    showingAdRef.current = true;
    setShowingAd(true);
    setErrorMessage(null);
    let result: RewardedShowResult = "error";
    try {
      result = await yandexRewardedService.showFor(ritualId);
    } catch {
      result = "error";
    } finally {
      showingAdRef.current = false;
      setShowingAd(false);
    }

    if (result !== "rewarded") {
      setErrorMessage(getFailureMessage(result));
      return;
    }

    const pending = pendingAttemptRef.current;
    const access = dailyRitualAccessService.beginAttempt(ritualId);
    if (access !== "reward") {
      setErrorMessage("Не удалось сохранить награду. Попробуйте ещё раз.");
      return;
    }

    activeAttemptRef.current = true;
    activeAttemptAccessRef.current = access;
    pendingAttemptRef.current = null;
    setPromptVisible(false);
    if (pending?.resumeAfterReward) pending.begin();
  }, [ritualId]);

  return {
    beginAttempt,
    recordResult,
    prompt: {
      visible: promptVisible,
      ritualId,
      showingAd,
      errorMessage,
      onWatchAd: watchAd,
      onDismiss: dismissPrompt,
    },
  };
}
