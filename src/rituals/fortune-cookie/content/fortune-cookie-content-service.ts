import { Storage as kvStore } from "expo-sqlite/kv-store";

import { PersistentShuffleBag } from "@/predictions/persistent-shuffle-bag";

import { fortuneCookieRepository } from "./fortune-cookie-repository";

const STORAGE_KEY = "fortune-room.fortune-cookie.prediction-deck.v1";
const deck = new PersistentShuffleBag(
  fortuneCookieRepository.entries,
  kvStore,
  STORAGE_KEY,
  30,
);

export const fortuneCookieContentService = {
  prepare: () => deck.prepare(),
  async consumeNext() {
    const reserved = await deck.reserve();
    const committed = await deck.commit();
    if (!committed || committed.id !== reserved.id) {
      throw new Error("Fortune Cookie prediction reservation was not committed.");
    }
    return reserved;
  },
};

export type { FortuneCookieEntry, FortuneCookieTone } from "./fortune-cookie-content-types";
