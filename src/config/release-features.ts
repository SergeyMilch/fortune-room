import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export const runtimeConfig = Object.freeze({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  yandexAdsEnabled: process.env.EXPO_PUBLIC_YANDEX_ADS_ENABLED === "true",
  yandexRewardedAdUnitId: process.env.EXPO_PUBLIC_YANDEX_REWARDED_AD_UNIT_ID ?? "",
  rewardedGateEnabled: process.env.EXPO_PUBLIC_REWARDED_GATE_ENABLED === "true",
  rustoreReviewEnabled: process.env.EXPO_PUBLIC_RUSTORE_REVIEW_ENABLED === "true",
  rustoreUpdateEnabled: process.env.EXPO_PUBLIC_RUSTORE_UPDATE_ENABLED === "true",
});

// StoreClient also includes development builds, so executionEnvironment alone
// cannot distinguish them from Expo Go. expoGoConfig is only populated by
// Expo Go and remains null in standalone and development builds.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  && Constants.expoGoConfig != null;
const canUseAndroidNativeModules = Platform.OS === "android" && !isExpoGo;

export const releaseFeatures = Object.freeze({
  isProduction: runtimeConfig.appEnv === "production",
  isExpoGo,
  rustoreReview: canUseAndroidNativeModules && runtimeConfig.rustoreReviewEnabled,
  rustoreUpdate: canUseAndroidNativeModules && runtimeConfig.rustoreUpdateEnabled,
  yandexAds: canUseAndroidNativeModules && runtimeConfig.yandexAdsEnabled,
  rewardedGate: canUseAndroidNativeModules && runtimeConfig.rewardedGateEnabled,
  yandexRewardedAdUnitId: runtimeConfig.yandexRewardedAdUnitId,
});
