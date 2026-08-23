import AsyncStorage from "expo-sqlite/kv-store";

import { releaseFeatures } from "@/config/release-features";

import { shouldRequestReview } from "./rustore-release-policy";

const REVIEW_COMPLETIONS_KEY = "rustore.review.completedRituals";
const REVIEW_LAST_ATTEMPT_KEY = "rustore.review.lastAttemptAt";

function parseStoredNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function reportDevelopmentError(label: string, error: unknown) {
  if (__DEV__) console.warn(label, error);
}

class RuStoreReleaseService {
  private updatePromise: Promise<void> | null = null;
  private reviewPromise: Promise<void> | null = null;

  checkForUpdateOnLaunch() {
    if (!releaseFeatures.rustoreUpdate) return Promise.resolve();
    if (!this.updatePromise) {
      this.updatePromise = this.runUpdateCheck().catch((error: unknown) => {
        reportDevelopmentError("RuStore update check failed", error);
      });
    }
    return this.updatePromise;
  }

  recordCompletedRitual() {
    if (!releaseFeatures.rustoreReview) return Promise.resolve();
    if (!this.reviewPromise) {
      this.reviewPromise = this.recordCompletionAndMaybeRequestReview()
        .catch((error: unknown) => {
          reportDevelopmentError("RuStore review request failed", error);
        })
        .finally(() => {
          this.reviewPromise = null;
        });
    }
    return this.reviewPromise;
  }

  private async runUpdateCheck() {
    const updateModule = await import("react-native-rustore-update");
    const {
      AppUpdateType,
      Events,
      InstallStatus,
      ResultCode,
      UpdateAvailability,
      default: client,
      eventEmitter,
    } = updateModule;
    client.init();

    const info = await client.getAppUpdateInfo();
    if (info.installStatus === InstallStatus.DOWNLOADED) {
      await client.completeUpdate(AppUpdateType.FLEXIBLE);
      return;
    }

    const canContinue = info.updateAvailability === UpdateAvailability.UPDATE_AVAILABLE
      || info.updateAvailability === UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
    if (!canContinue) return;

    let subscription: { remove(): void } | null = null;
    subscription = eventEmitter.addListener(Events.INSTALL_STATE_UPDATE, (state) => {
      if (state.installStatus === InstallStatus.DOWNLOADED) {
        subscription?.remove();
        subscription = null;
        void client.completeUpdate(AppUpdateType.FLEXIBLE).catch((error: unknown) => {
          reportDevelopmentError("RuStore update installation failed", error);
        });
      } else if (state.installStatus === InstallStatus.FAILED) {
        subscription?.remove();
        subscription = null;
      }
    });

    if (info.updateAvailability === UpdateAvailability.UPDATE_AVAILABLE) {
      const result = await client.download();
      if (result !== ResultCode.RESULT_OK) subscription?.remove();
    }
  }

  private async recordCompletionAndMaybeRequestReview() {
    const [completedValue, lastAttemptValue] = await Promise.all([
      AsyncStorage.getItem(REVIEW_COMPLETIONS_KEY),
      AsyncStorage.getItem(REVIEW_LAST_ATTEMPT_KEY),
    ]);
    const completedRituals = parseStoredNumber(completedValue) + 1;
    await AsyncStorage.setItem(REVIEW_COMPLETIONS_KEY, String(completedRituals));

    const now = Date.now();
    if (!shouldRequestReview({
      completedRituals,
      lastAttemptAt: parseStoredNumber(lastAttemptValue),
      now,
    })) return;

    await AsyncStorage.setItem(REVIEW_LAST_ATTEMPT_KEY, String(now));
    const { default: client } = await import("react-native-rustore-review");
    client.init();
    const canShow = await client.requestReviewFlow();
    if (!canShow) return;
    await client.launchReviewFlow();
  }
}

export const rustoreReleaseService = new RuStoreReleaseService();
