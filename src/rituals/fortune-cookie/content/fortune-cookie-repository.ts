import contentPackJson from "./fortune-cookie-ru-700.json";

import type { FortuneCookieEntry, FortuneCookieTone } from "./fortune-cookie-content-types";

type FortuneCookieContentPack = {
  version: number;
  language: string;
  ritual: string;
  entryCount: number;
  entries: FortuneCookieEntry[];
};

const validTones = new Set<FortuneCookieTone>([
  "hopeful",
  "neutral",
  "mysterious",
  "cautionary",
  "playful",
]);
const contentPack = contentPackJson as FortuneCookieContentPack;

export function validateFortuneCookieContent(entries: readonly FortuneCookieEntry[]): void {
  if (entries.length !== 700) throw new Error(`Fortune Cookie requires 700 entries, got ${entries.length}.`);
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const entry of entries) {
    const words = entry.text.trim().split(/\s+/u).length;
    if (!entry.id || !entry.text.trim() || !entry.category.trim()) {
      throw new Error(`Fortune Cookie entry ${entry.id || "<without id>"} has an empty field.`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate Fortune Cookie id: ${entry.id}`);
    if (texts.has(entry.text)) throw new Error(`Duplicate Fortune Cookie text: ${entry.text}`);
    if (!validTones.has(entry.tone)) throw new Error(`Invalid Fortune Cookie tone: ${entry.tone}`);
    if (entry.text.length < 30 || entry.text.length > 85 || words < 5 || words > 13) {
      throw new Error(`Fortune Cookie entry ${entry.id} is outside the approved length.`);
    }
    ids.add(entry.id);
    texts.add(entry.text);
  }
}

if (
  contentPack.version !== 1 ||
  contentPack.language !== "ru" ||
  contentPack.ritual !== "fortune-cookie" ||
  contentPack.entryCount !== 700
) {
  throw new Error("Unexpected Fortune Cookie content pack metadata.");
}

if (typeof __DEV__ !== "undefined" && __DEV__) validateFortuneCookieContent(contentPack.entries);

const entries = Object.freeze(contentPack.entries.map((entry) => Object.freeze({ ...entry })));

export const fortuneCookieRepository = {
  entries,
};
