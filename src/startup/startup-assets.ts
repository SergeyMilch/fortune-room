import { Asset } from "expo-asset";
import { loadAsync as loadFontsAsync } from "expo-font";

import { prepareAudioAssets } from "@/services/audio-service";

const startupImages = [
  require("../../assets/branding/icon.png"),
  require("../../assets/home/fortune-room-home-no-flames.png"),
  require("../../assets/crystal-ball/vfx/flame-03-16x4.png"),
  require("../../assets/crystal-ball/vfx/wispy-smoke-03-8x8.png"),
  require("../../assets/crystal-ball/layers/static-layered-preview-no-flames.png"),
  require("../../assets/crystal-ball/layers/smoke-mask-outer.png"),
  require("../../assets/crystal-ball/layers/candle-light-mask.png"),
  require("../../assets/fortune-book/scene/book-closed-no-flames.png"),
  require("../../assets/fortune-book/layers/scene-background-no-flames.png"),
  require("../../assets/fortune-book/layers/book-body-no-flames.png"),
  require("../../assets/fortune-book/layers/left-resting-page.png"),
  require("../../assets/fortune-book/layers/right-under-page.png"),
  require("../../assets/fortune-book/layers/moving-top-page.png"),
  require("../../assets/fortune-cookie/runtime/scene-background-no-flame.png"),
  require("../../assets/fortune-cookie/runtime/tray.png"),
  require("../../assets/fortune-cookie/runtime/cookie-01.png"),
  require("../../assets/fortune-cookie/runtime/cookie-02.png"),
  require("../../assets/fortune-cookie/runtime/cookie-03.png"),
  require("../../assets/fortune-cookie/runtime/cookie-left-half.png"),
  require("../../assets/fortune-cookie/runtime/cookie-right-half.png"),
  require("../../assets/fortune-cookie/runtime/paper-strip.png"),
  require("../../assets/fortune-cookie/runtime/crumbs-01.png"),
  require("../../assets/fortune-cookie/runtime/crumbs-02.png"),
  require("../../assets/fortune-cookie/runtime/crumbs-03.png"),
  require("../../assets/fortune-coin/runtime/coin-scene-no-flame.png"),
  require("../../assets/fortune-coin/runtime/coin-sun.png"),
  require("../../assets/fortune-coin/runtime/coin-moon.png"),
  require("../../assets/fortune-coin/runtime/coin-edge.png"),
  require("../../assets/runes/runtime/scene-background-no-flame.png"),
  require("../../assets/runes/runtime/rune-pouch.png"),
  require("../../assets/runes/runtime/rune-stone.png"),
] as const;

const startupFonts = {
  MrAkronim: require("../../assets/fonts/mr-akronim.otf"),
  Balkara: require("../../assets/fonts/balkara.ttf"),
  Sjz: require("../../assets/fonts/sjz.otf"),
  TanaUncial: require("../../assets/fonts/tana-uncial-sp.ttf"),
} as const;

let preparationPromise: Promise<void> | null = null;

export function prepareStartupAssets(): Promise<void> {
  if (!preparationPromise) {
    preparationPromise = Promise.allSettled([
      Asset.loadAsync([...startupImages]),
      loadFontsAsync(startupFonts),
      prepareAudioAssets(),
    ])
      .then((results) => {
        const failedTasks = results.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        if (failedTasks.length > 0) {
          console.warn(
            "[Startup] Some assets could not be preloaded",
            failedTasks.map(({ reason }) => reason),
          );
        }
      });
  }

  return preparationPromise;
}
