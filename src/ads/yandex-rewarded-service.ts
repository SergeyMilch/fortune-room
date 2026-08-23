import { releaseFeatures } from "@/config/release-features";

import { dailyRitualAccessService } from "./daily-ritual-access-service";
import type { RitualId } from "./ritual-access";

type YandexAdsModule = typeof import("yandex-mobile-ads");
type LoadedRewardedAd = Awaited<ReturnType<YandexAdsModule["RewardedAdLoader"]["prototype"]["loadAd"]>>;
type RewardedLoader = Awaited<ReturnType<YandexAdsModule["RewardedAdLoader"]["create"]>>;

export type RewardedShowResult = "rewarded" | "dismissed" | "unavailable" | "busy" | "error";

const SHOW_TIMEOUT_MS = 120_000;

class YandexRewardedService {
  private initializePromise: Promise<void> | null = null;
  private loadPromise: Promise<void> | null = null;
  private loader: RewardedLoader | null = null;
  private loadedAd: LoadedRewardedAd | null = null;
  private pendingRitualId: RitualId | null = null;
  private showing = false;

  initializeAndPreload() {
    if (!releaseFeatures.yandexAds || !releaseFeatures.yandexRewardedAdUnitId) {
      return Promise.resolve();
    }
    if (!this.initializePromise) {
      this.initializePromise = this.initializeNative().catch((error: unknown) => {
        this.initializePromise = null;
        this.reportDevelopmentError("Yandex Mobile Ads initialization failed", error);
      });
    }
    return this.initializePromise;
  }

  async showFor(ritualId: RitualId): Promise<RewardedShowResult> {
    if (!releaseFeatures.yandexAds) return "unavailable";
    if (this.showing || this.pendingRitualId !== null) return "busy";
    if (!this.loadedAd) {
      void this.initializeAndPreload().then(() => this.preload());
      return "unavailable";
    }

    const ad = this.loadedAd;
    this.loadedAd = null;
    this.showing = true;
    this.pendingRitualId = ritualId;

    return new Promise<RewardedShowResult>((resolve) => {
      let settled = false;
      let rewarded = false;
      const timeout = setTimeout(() => settle("error"), SHOW_TIMEOUT_MS);

      const settle = (result: RewardedShowResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.showing = false;
        this.pendingRitualId = null;
        resolve(result);
        void this.preload();
      };

      ad.onRewarded = () => {
        if (rewarded || this.pendingRitualId !== ritualId) return;
        rewarded = true;
        dailyRitualAccessService.grantAttempt(ritualId);
      };
      ad.onAdDismissed = () => settle(rewarded ? "rewarded" : "dismissed");
      ad.onAdFailedToShow = (error) => {
        this.reportDevelopmentError("Yandex Rewarded failed to show", error);
        settle(rewarded ? "rewarded" : "error");
      };

      void ad.show().catch((error: unknown) => {
        this.reportDevelopmentError("Yandex Rewarded show rejected", error);
        settle("error");
      });
    });
  }

  private async initializeNative() {
    const sdk = await import("yandex-mobile-ads");
    await sdk.MobileAds.initialize();
    this.loader = await sdk.RewardedAdLoader.create();
    await this.preload();
  }

  private preload() {
    if (!releaseFeatures.yandexAds || !this.loader || this.loadedAd || this.showing) {
      return Promise.resolve();
    }
    if (!this.loadPromise) {
      this.loadPromise = this.loader.loadAd({
        adUnitId: releaseFeatures.yandexRewardedAdUnitId,
      }).then((ad) => {
        this.loadedAd = ad;
      }).catch((error: unknown) => {
        this.reportDevelopmentError("Yandex Rewarded preload failed", error);
      }).finally(() => {
        this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  private reportDevelopmentError(label: string, error: unknown) {
    if (__DEV__) console.warn(label, error);
  }
}

export const yandexRewardedService = new YandexRewardedService();
