import * as Haptics from "expo-haptics";
import kvStore from "expo-sqlite/kv-store";

const HAPTIC_ENABLED_KEY = "fortune-room.settings.haptic-enabled";

class HapticService {
  private enabled: boolean | null = null;
  private settingPromise: Promise<boolean> | null = null;
  private settingRevision = 0;

  async getHapticEnabled(): Promise<boolean> {
    return this.loadHapticEnabled();
  }

  async setHapticEnabled(enabled: boolean): Promise<void> {
    this.settingRevision += 1;
    this.enabled = enabled;
    await kvStore.setItem(HAPTIC_ENABLED_KEY, enabled ? "true" : "false");
  }

  async impactAsync(style: Haptics.ImpactFeedbackStyle): Promise<void> {
    if (await this.loadHapticEnabled()) {
      await Haptics.impactAsync(style);
    }
  }

  async selectionAsync(): Promise<void> {
    if (await this.loadHapticEnabled()) {
      await Haptics.selectionAsync();
    }
  }

  private loadHapticEnabled(): Promise<boolean> {
    if (this.enabled !== null) return Promise.resolve(this.enabled);

    if (!this.settingPromise) {
      const revision = this.settingRevision;
      this.settingPromise = kvStore
        .getItem(HAPTIC_ENABLED_KEY)
        .then((value) => {
          const storedValue = value !== "false";
          if (revision === this.settingRevision) this.enabled = storedValue;
          return this.enabled ?? storedValue;
        })
        .catch(() => {
          if (revision === this.settingRevision) this.enabled = true;
          return this.enabled ?? true;
        });
    }

    return this.settingPromise;
  }
}

export const hapticService = new HapticService();
