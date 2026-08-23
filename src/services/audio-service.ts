import AsyncStorage from "expo-sqlite/kv-store";
import {
  createAudioPlayer,
  preload,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";

const SOUND_ENABLED_KEY = "fortune-room.settings.sound-enabled";

const audioSources = {
  roomAmbient: require("../../assets/audio/ambience/fortune-room-ambient.mp3"),
  candleCrackle: require("../../assets/audio/ambience/candle-crackle.mp3"),
  touch: require("../../assets/audio/crystal-ball/touch.wav"),
  charging: require("../../assets/audio/crystal-ball/charging-loop.mp3"),
  peak: require("../../assets/audio/crystal-ball/peak-shimmer.wav"),
  reveal: require("../../assets/audio/crystal-ball/reveal-mystical-chime.mp3"),
  pageTurn: require("../../assets/audio/fortune-book/page-turn.wav"),
  cookieBreak: require("../../assets/audio/fortune-cookie/cookie-crumbs.wav"),
  coinFlip: require("../../assets/audio/fortune-coin/coin-flip-game.wav"),
  coinLand: require("../../assets/audio/fortune-coin/coin-land-game.wav"),
  runesBagShake01: require("../../assets/audio/runes/runes-bag-shake-01.wav"),
  runesBagShake02: require("../../assets/audio/runes/runes-bag-shake-02.wav"),
  runesBagShake03: require("../../assets/audio/runes/runes-bag-shake-03.wav"),
  runesPour: require("../../assets/audio/runes/runes-pour.wav"),
  runeStoneHit01: require("../../assets/audio/runes/stone-hit-01.wav"),
  runeStoneHit02: require("../../assets/audio/runes/stone-hit-02.wav"),
  runeStoneHit03: require("../../assets/audio/runes/stone-hit-03.wav"),
  runeStoneHit04: require("../../assets/audio/runes/stone-hit-04.wav"),
  runeStoneHit05: require("../../assets/audio/runes/stone-hit-05.wav"),
  runeStoneHit06: require("../../assets/audio/runes/stone-hit-06.wav"),
  runePick01: require("../../assets/audio/runes/rune-pick-01.wav"),
  runePick02: require("../../assets/audio/runes/rune-pick-02.wav"),
  runeFlip01: require("../../assets/audio/runes/rune-flip-01.wav"),
  runeFlip02: require("../../assets/audio/runes/rune-flip-02.wav"),
  runeReveal: require("../../assets/audio/runes/rune-reveal.wav"),
} satisfies Record<string, AudioSource>;

export const crystalBallAudioVolumes = {
  roomAmbient: 0.1,
  candleCrackle: 0.025,
  touch: 0.23,
  chargingPeak: 0.22,
  peak: 0.34,
  reveal: 0.25,
} as const;

export const fortuneBookAudioVolumes = {
  pageTurn: 0.22,
} as const;

export const fortuneCookieAudioVolumes = {
  cookieBreak: 0.32,
} as const;

export const fortuneCoinAudioVolumes = {
  flip: 0.34,
  land: 0.42,
} as const;

export const runesAudioVolumes = {
  bagShake: 0.26,
  pour: 0.34,
  pick: 0.17,
  flip: 0.3,
  reveal: 0.22,
} as const;

type AudioPlayers = {
  roomAmbient: AudioPlayer;
  candleCrackle: AudioPlayer;
  touch: AudioPlayer;
  charging: AudioPlayer;
  peak: AudioPlayer;
  reveal: AudioPlayer;
  pageTurnA: AudioPlayer;
  pageTurnB: AudioPlayer;
  cookieBreak: AudioPlayer;
  coinFlip: AudioPlayer;
  coinLand: AudioPlayer;
  runesBagShake01: AudioPlayer;
  runesBagShake02: AudioPlayer;
  runesBagShake03: AudioPlayer;
  runesPour: AudioPlayer;
  runeStoneHit01: AudioPlayer;
  runeStoneHit02: AudioPlayer;
  runeStoneHit03: AudioPlayer;
  runeStoneHit04: AudioPlayer;
  runeStoneHit05: AudioPlayer;
  runeStoneHit06: AudioPlayer;
  runePick01: AudioPlayer;
  runePick02: AudioPlayer;
  runeFlip01: AudioPlayer;
  runeFlip02: AudioPlayer;
  runeReveal: AudioPlayer;
};

type PlayerName = keyof AudioPlayers;
type AudioContextName =
  | "home"
  | "crystal-ball"
  | "fortune-book"
  | "fortune-cookie"
  | "fortune-coin"
  | "runes";

const runesStoneHitSequence = [
  { delayMs: 80, player: "runeStoneHit03", volume: 0.45 },
  { delayMs: 170, player: "runeStoneHit01", volume: 0.32 },
  { delayMs: 260, player: "runeStoneHit05", volume: 0.4 },
  { delayMs: 390, player: "runeStoneHit02", volume: 0.27 },
  { delayMs: 520, player: "runeStoneHit06", volume: 0.36 },
  { delayMs: 650, player: "runeStoneHit04", volume: 0.31 },
  { delayMs: 770, player: "runeStoneHit01", volume: 0.29 },
  { delayMs: 900, player: "runeStoneHit05", volume: 0.34 },
] as const satisfies readonly {
  delayMs: number;
  player: PlayerName;
  volume: number;
}[];

const preloadPromise = Promise.all(Object.values(audioSources).map((source) => preload(source))).then(
  () => undefined,
  () => undefined,
);

export function prepareAudioAssets(): Promise<void> {
  return preloadPromise;
}

class AudioService {
  private players: AudioPlayers | null = null;
  private activationPromise: Promise<void> | null = null;
  private activationId = 0;
  private activeContexts = new Set<AudioContextName>();
  private soundEnabled: boolean | null = null;
  private settingPromise: Promise<boolean> | null = null;
  private soundSettingRevision = 0;
  private ritualActive = false;
  private chargingProgress = 0;
  private peakPlayed = false;
  private revealPlayed = false;
  private nextPageTurnPlayer: "pageTurnA" | "pageTurnB" = "pageTurnA";
  private fadeTimers = new Map<PlayerName, ReturnType<typeof setInterval>>();
  private runesTimers: ReturnType<typeof setTimeout>[] = [];
  private lastRunesBagShake = -1;
  private lastRunePick = -1;
  private lastRuneFlip = -1;

  activateCrystalBallContext(): Promise<void> {
    return this.activateContext("crystal-ball");
  }

  deactivateCrystalBallContext(): void {
    this.deactivateContext("crystal-ball");
  }

  activateFortuneBookContext(): Promise<void> {
    return this.activateContext("fortune-book");
  }

  deactivateFortuneBookContext(): void {
    this.stopFortuneBookPageTurns();
    this.deactivateContext("fortune-book");
  }

  activateFortuneCookieContext(): Promise<void> {
    return this.activateContext("fortune-cookie");
  }

  deactivateFortuneCookieContext(): void {
    this.stopFortuneCookieBreak();
    this.deactivateContext("fortune-cookie");
  }

  activateFortuneCoinContext(): Promise<void> {
    return this.activateContext("fortune-coin");
  }

  deactivateFortuneCoinContext(): void {
    this.stopFortuneCoinSounds();
    this.deactivateContext("fortune-coin");
  }

  activateRunesContext(): Promise<void> {
    return this.activateContext("runes");
  }

  deactivateRunesContext(): void {
    this.stopRunesSounds();
    this.deactivateContext("runes");
  }

  activateHomeContext(): Promise<void> {
    return this.activateContext("home");
  }

  deactivateHomeContext(): void {
    this.deactivateContext("home");
  }

  playFortuneBookPageTurn(): void {
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      const name = this.nextPageTurnPlayer;
      this.nextPageTurnPlayer = name === "pageTurnA" ? "pageTurnB" : "pageTurnA";
      this.playOneShot(name, players[name], fortuneBookAudioVolumes.pageTurn, false);
    });
  }

  stopFortuneBookPageTurns(): void {
    this.nextPageTurnPlayer = "pageTurnA";
    if (!this.players) return;
    this.stopAndRewind("pageTurnA", this.players.pageTurnA);
    this.stopAndRewind("pageTurnB", this.players.pageTurnB);
  }

  playFortuneCookieBreak(): void {
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot(
        "cookieBreak",
        players.cookieBreak,
        fortuneCookieAudioVolumes.cookieBreak,
        false,
      );
    });
  }

  stopFortuneCookieBreak(): void {
    if (!this.players) return;
    this.stopAndRewind("cookieBreak", this.players.cookieBreak);
  }

  playFortuneCoinFlip(): void {
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot("coinFlip", players.coinFlip, fortuneCoinAudioVolumes.flip, false);
    });
  }

  playFortuneCoinLand(): void {
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot("coinLand", players.coinLand, fortuneCoinAudioVolumes.land, false);
    });
  }

  stopFortuneCoinSounds(): void {
    if (!this.players) return;
    this.stopAndRewind("coinFlip", this.players.coinFlip);
    this.stopAndRewind("coinLand", this.players.coinLand);
  }

  playRunesBagShake(): void {
    const names = ["runesBagShake01", "runesBagShake02", "runesBagShake03"] as const;
    this.lastRunesBagShake = this.chooseDifferentIndex(names.length, this.lastRunesBagShake);
    const name = names[this.lastRunesBagShake];
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot(name, players[name], runesAudioVolumes.bagShake, false);
    });
  }

  playRunesCast(): void {
    this.clearRunesTimers();
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot("runesPour", players.runesPour, runesAudioVolumes.pour, false);
    });

    runesStoneHitSequence.forEach(({ delayMs, player, volume }) => {
      const timer = setTimeout(() => {
        void this.withCurrentPlayers((players) => {
          if (!this.isPlaybackAllowed()) return;
          this.playOneShot(player, players[player], volume, false);
        });
      }, delayMs);
      this.runesTimers.push(timer);
    });
  }

  playRunePick(): void {
    const names = ["runePick01", "runePick02"] as const;
    this.lastRunePick = this.chooseDifferentIndex(names.length, this.lastRunePick);
    const name = names[this.lastRunePick];
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot(name, players[name], runesAudioVolumes.pick, false);
    });
  }

  playRuneFlip(): void {
    const names = ["runeFlip01", "runeFlip02"] as const;
    this.lastRuneFlip = this.chooseDifferentIndex(names.length, this.lastRuneFlip);
    const name = names[this.lastRuneFlip];
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot(name, players[name], runesAudioVolumes.flip, false);
    });
  }

  playRuneReveal(): void {
    void this.withCurrentPlayers((players) => {
      if (!this.isPlaybackAllowed()) return;
      this.playOneShot("runeReveal", players.runeReveal, runesAudioVolumes.reveal, false);
    });
  }

  stopRunesSounds(): void {
    this.clearRunesTimers();
    this.lastRunesBagShake = -1;
    this.lastRunePick = -1;
    this.lastRuneFlip = -1;
    if (!this.players) return;
    const names = [
      "runesBagShake01", "runesBagShake02", "runesBagShake03", "runesPour",
      "runeStoneHit01", "runeStoneHit02", "runeStoneHit03", "runeStoneHit04",
      "runeStoneHit05", "runeStoneHit06", "runePick01", "runePick02",
      "runeFlip01", "runeFlip02", "runeReveal",
    ] as const;
    names.forEach((name) => this.stopAndRewind(name, this.players![name]));
  }

  private activateContext(context: AudioContextName): Promise<void> {
    const wasInactive = this.activeContexts.size === 0;
    this.activeContexts.add(context);
    if (wasInactive) this.activationId += 1;
    const activationId = this.activationId;

    if (this.players) {
      if (this.soundEnabled) this.startAmbientLayers();
      return Promise.resolve();
    }

    if (!this.activationPromise) {
      this.activationPromise = this.prepareContext(activationId)
        .catch(() => undefined)
        .finally(() => {
          this.activationPromise = null;
        });
    }

    return this.activationPromise;
  }

  private deactivateContext(context: AudioContextName): void {
    this.activeContexts.delete(context);
    if (this.activeContexts.size > 0) return;

    this.activationId += 1;
    this.resetRitual();
    this.removePlayers();
  }

  async getSoundEnabled(): Promise<boolean> {
    return this.loadSoundEnabled();
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    this.soundSettingRevision += 1;
    this.soundEnabled = enabled;

    if (!enabled) {
      this.stopAllPlayers();
    } else if (this.activeContexts.size > 0) {
      await this.ensurePlayersForCurrentContext();
      this.startAmbientLayers();
      this.restoreChargingLayer();
    }

    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
  }

  onValidHoldBegin(): void {
    this.ritualActive = true;
    this.chargingProgress = 0;
    this.peakPlayed = false;
    this.revealPlayed = false;

    void this.withPlayers((players) => {
      if (!this.isPlaybackAllowed() || !this.ritualActive) return;
      this.playOneShot("touch", players.touch, crystalBallAudioVolumes.touch);
      this.startChargingLoop(players.charging);
    });
  }

  updateChargingProgress(progress: number): void {
    this.chargingProgress = Math.max(0, Math.min(1, progress));
    if (!this.players || !this.isPlaybackAllowed() || !this.ritualActive) return;

    const targetVolume = crystalBallAudioVolumes.chargingPeak * Math.pow(this.chargingProgress, 1.2);
    this.players.charging.volume = targetVolume;

    if (targetVolume > 0 && !this.players.charging.playing) {
      this.players.charging.play();
    }
  }

  onPeak(): void {
    if (this.peakPlayed) return;
    this.peakPlayed = true;

    void this.withPlayers((players) => {
      if (!this.isPlaybackAllowed() || !this.ritualActive) return;
      this.playOneShot("peak", players.peak, crystalBallAudioVolumes.peak);
    });
  }

  onReveal(): void {
    if (this.revealPlayed) return;
    this.revealPlayed = true;

    void this.withPlayers((players) => {
      if (!this.isPlaybackAllowed() || !this.ritualActive) return;
      this.playOneShot("reveal", players.reveal, crystalBallAudioVolumes.reveal);
    });
  }

  resetRitual(): void {
    this.ritualActive = false;
    this.chargingProgress = 0;
    this.peakPlayed = false;
    this.revealPlayed = false;

    if (!this.players) return;
    this.stopAndRewind("charging", this.players.charging);
    this.stopAndRewind("touch", this.players.touch);
    this.stopAndRewind("peak", this.players.peak);
    this.stopAndRewind("reveal", this.players.reveal);
    this.stopFortuneBookPageTurns();
    this.stopFortuneCookieBreak();
    this.stopFortuneCoinSounds();
    this.stopRunesSounds();
  }

  private async prepareContext(activationId: number): Promise<void> {
    const soundEnabled = await this.loadSoundEnabled();
    await Promise.all([
      preloadPromise,
      setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      }),
    ]);

    if (this.activeContexts.size === 0 || activationId !== this.activationId) return;
    if (!this.players) this.players = this.createPlayers();
    if (soundEnabled) this.startAmbientLayers();
  }

  private createPlayers(): AudioPlayers {
    const players: AudioPlayers = {
      roomAmbient: createAudioPlayer(audioSources.roomAmbient),
      candleCrackle: createAudioPlayer(audioSources.candleCrackle),
      touch: createAudioPlayer(audioSources.touch),
      charging: createAudioPlayer(audioSources.charging),
      peak: createAudioPlayer(audioSources.peak),
      reveal: createAudioPlayer(audioSources.reveal),
      pageTurnA: createAudioPlayer(audioSources.pageTurn),
      pageTurnB: createAudioPlayer(audioSources.pageTurn),
      cookieBreak: createAudioPlayer(audioSources.cookieBreak),
      coinFlip: createAudioPlayer(audioSources.coinFlip),
      coinLand: createAudioPlayer(audioSources.coinLand),
      runesBagShake01: createAudioPlayer(audioSources.runesBagShake01),
      runesBagShake02: createAudioPlayer(audioSources.runesBagShake02),
      runesBagShake03: createAudioPlayer(audioSources.runesBagShake03),
      runesPour: createAudioPlayer(audioSources.runesPour),
      runeStoneHit01: createAudioPlayer(audioSources.runeStoneHit01),
      runeStoneHit02: createAudioPlayer(audioSources.runeStoneHit02),
      runeStoneHit03: createAudioPlayer(audioSources.runeStoneHit03),
      runeStoneHit04: createAudioPlayer(audioSources.runeStoneHit04),
      runeStoneHit05: createAudioPlayer(audioSources.runeStoneHit05),
      runeStoneHit06: createAudioPlayer(audioSources.runeStoneHit06),
      runePick01: createAudioPlayer(audioSources.runePick01),
      runePick02: createAudioPlayer(audioSources.runePick02),
      runeFlip01: createAudioPlayer(audioSources.runeFlip01),
      runeFlip02: createAudioPlayer(audioSources.runeFlip02),
      runeReveal: createAudioPlayer(audioSources.runeReveal),
    };

    players.roomAmbient.loop = true;
    players.candleCrackle.loop = true;
    players.charging.loop = true;
    Object.values(players).forEach((player) => {
      player.volume = 0;
    });

    return players;
  }

  private startAmbientLayers(): void {
    if (!this.players || !this.isPlaybackAllowed()) return;

    this.startLoopWithFade(
      "roomAmbient",
      this.players.roomAmbient,
      crystalBallAudioVolumes.roomAmbient,
      900,
    );
    this.startLoopWithFade(
      "candleCrackle",
      this.players.candleCrackle,
      crystalBallAudioVolumes.candleCrackle,
      1200,
    );
  }

  private startLoopWithFade(
    name: PlayerName,
    player: AudioPlayer,
    targetVolume: number,
    durationMs: number,
  ): void {
    if (!player.playing) {
      player.volume = 0;
      player.play();
    }
    this.fadeTo(name, player, targetVolume, durationMs);
  }

  private startChargingLoop(player: AudioPlayer): void {
    this.clearFade("charging");
    player.volume = 0;
    if (!player.playing) player.play();
  }

  private restoreChargingLayer(): void {
    if (!this.players || !this.ritualActive || this.chargingProgress <= 0) return;
    this.players.charging.volume =
      crystalBallAudioVolumes.chargingPeak * Math.pow(this.chargingProgress, 1.2);
    if (!this.players.charging.playing) this.players.charging.play();
  }

  private playOneShot(
    name: PlayerName,
    player: AudioPlayer,
    volume: number,
    requiresRitual = true,
  ): void {
    const activationId = this.activationId;
    this.clearFade(name);
    player.pause();
    player.volume = volume;
    void player.seekTo(0).then(() => {
      if (
        activationId === this.activationId &&
        this.isPlaybackAllowed() &&
        (!requiresRitual || this.ritualActive)
      ) {
        player.play();
      }
    });
  }

  private fadeTo(
    name: PlayerName,
    player: AudioPlayer,
    targetVolume: number,
    durationMs: number,
  ): void {
    this.clearFade(name);
    const initialVolume = player.volume;
    const startedAt = Date.now();

    const timer = setInterval(() => {
      if (!this.isPlaybackAllowed()) {
        this.clearFade(name);
        return;
      }

      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      player.volume = initialVolume + (targetVolume - initialVolume) * progress;

      if (progress >= 1) this.clearFade(name);
    }, 50);

    this.fadeTimers.set(name, timer);
  }

  private clearFade(name: PlayerName): void {
    const timer = this.fadeTimers.get(name);
    if (!timer) return;
    clearInterval(timer);
    this.fadeTimers.delete(name);
  }

  private clearRunesTimers(): void {
    this.runesTimers.forEach(clearTimeout);
    this.runesTimers = [];
  }

  private chooseDifferentIndex(length: number, previous: number): number {
    if (length <= 1) return 0;
    if (previous < 0 || previous >= length) return Math.floor(Math.random() * length);
    const candidate = Math.floor(Math.random() * (length - 1));
    return candidate >= previous ? candidate + 1 : candidate;
  }

  private stopAndRewind(name: PlayerName, player: AudioPlayer): void {
    this.clearFade(name);
    player.pause();
    player.volume = 0;
    void player.seekTo(0);
  }

  private stopAllPlayers(): void {
    if (!this.players) return;
    (Object.entries(this.players) as [PlayerName, AudioPlayer][]).forEach(([name, player]) => {
      this.stopAndRewind(name, player);
    });
  }

  private removePlayers(): void {
    if (!this.players) return;
    this.stopAllPlayers();
    Object.values(this.players).forEach((player) => player.remove());
    this.players = null;
  }

  private async withPlayers(action: (players: AudioPlayers) => void): Promise<void> {
    await this.activateCrystalBallContext();
    if (this.players) action(this.players);
  }

  private async withCurrentPlayers(action: (players: AudioPlayers) => void): Promise<void> {
    await this.ensurePlayersForCurrentContext();
    if (this.players) action(this.players);
  }

  private ensurePlayersForCurrentContext(): Promise<void> {
    if (this.players || this.activeContexts.size === 0) return Promise.resolve();

    if (!this.activationPromise) {
      const activationId = this.activationId;
      this.activationPromise = this.prepareContext(activationId)
        .catch(() => undefined)
        .finally(() => {
          this.activationPromise = null;
        });
    }

    return this.activationPromise;
  }

  private isPlaybackAllowed(): boolean {
    return this.activeContexts.size > 0 && this.soundEnabled === true;
  }

  private loadSoundEnabled(): Promise<boolean> {
    if (this.soundEnabled !== null) return Promise.resolve(this.soundEnabled);
    if (!this.settingPromise) {
      const revision = this.soundSettingRevision;
      this.settingPromise = AsyncStorage.getItem(SOUND_ENABLED_KEY)
        .then((value) => {
          const storedValue = value !== "false";
          if (revision === this.soundSettingRevision) this.soundEnabled = storedValue;
          return this.soundEnabled ?? storedValue;
        })
        .catch(() => {
          if (revision === this.soundSettingRevision) this.soundEnabled = true;
          return this.soundEnabled ?? true;
        });
    }
    return this.settingPromise;
  }
}

export const audioService = new AudioService();
