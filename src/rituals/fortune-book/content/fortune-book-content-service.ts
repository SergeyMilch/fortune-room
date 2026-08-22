import { Storage as kvStore } from "expo-sqlite/kv-store";

import { FortuneBookContentEngine } from "./fortune-book-content-engine";
import { fortuneBookRepository } from "./fortune-book-repository";

const STORAGE_KEY = "fortune-room.fortune-book.shuffle.v1";
const engine = new FortuneBookContentEngine(fortuneBookRepository.entries, kvStore, STORAGE_KEY);
let selectedId: string | null = null;

export const fortuneBookContentService = {
  initialize: () => engine.initialize(),
  createNextSpread: () => engine.createNextSpread(),
  getById: (id: string) => engine.getById(id),
  setSelectedForDiagnostics(id: string | null) {
    selectedId = id;
  },
  getDiagnostics: () => engine.getDiagnostics(selectedId),
  async resetDev() {
    if (typeof __DEV__ !== "undefined" && !__DEV__) {
      throw new Error("Fortune Book shuffle reset is development-only.");
    }
    selectedId = null;
    return engine.resetDev();
  },
};

export type {
  FortuneBookDiagnostics,
  FortuneBookEntry,
  FortuneBookSpread,
  FortuneBookTheme,
  FortuneBookTone,
} from "./fortune-book-content-types";
