import { Storage as kvStore } from "expo-sqlite/kv-store";

import contentPackJson from "../../../assets/data/crystal-ball-predictions-ru.json";
import {
  PersistentShuffleBag,
  type PredictionEntry,
} from "@/predictions/persistent-shuffle-bag";

type PredictionContentPack = {
  schemaVersion: number;
  locale: string;
  ritual: string;
  selectionPolicyHint: string;
  entries: PredictionEntry[];
};

const contentPack = contentPackJson as PredictionContentPack;
const PREDICTION_DECK_STORAGE_KEY = "fortune-room.crystal-ball.prediction-deck.v1";

if (contentPack.ritual !== "crystal-ball" || contentPack.locale !== "ru-RU") {
  throw new Error("Unexpected Crystal Ball prediction content pack metadata.");
}

const predictionDeck = new PersistentShuffleBag(
  contentPack.entries,
  kvStore,
  PREDICTION_DECK_STORAGE_KEY,
  40,
);

export const crystalBallPredictionService = {
  prepare: () => predictionDeck.prepare(),
  reservePrediction: () => predictionDeck.reserve(),
  commitReservedPrediction: () => predictionDeck.commit(),
  abortReservedPrediction: () => predictionDeck.abort(),
};

export type { PredictionEntry };

