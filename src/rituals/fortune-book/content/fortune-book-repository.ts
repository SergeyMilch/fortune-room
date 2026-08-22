import contentPackJson from "./fortune-book-ru-1200.json";

import {
  FORTUNE_BOOK_THEMES,
  FORTUNE_BOOK_TONES,
  type FortuneBookEntry,
} from "./fortune-book-content-types";

type FortuneBookContentPack = {
  version: number;
  language: string;
  entryCount: number;
  themes: string[];
  tones: string[];
  entries: FortuneBookEntry[];
};

const contentPack = contentPackJson as FortuneBookContentPack;

export function validateFortuneBookContent(entries: readonly FortuneBookEntry[]): void {
  if (entries.length !== 1200) throw new Error(`Fortune Book requires 1200 entries, got ${entries.length}.`);

  const ids = new Set<string>();
  const lines = new Set<string>();
  const themes = new Set<string>(FORTUNE_BOOK_THEMES);
  const tones = new Set<string>(FORTUNE_BOOK_TONES);

  for (const entry of entries) {
    if (!entry.id || !entry.line.trim() || !entry.interpretation.trim()) {
      throw new Error(`Fortune Book entry ${entry.id || "<without id>"} has an empty field.`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate Fortune Book id: ${entry.id}`);
    if (lines.has(entry.line)) throw new Error(`Duplicate Fortune Book line: ${entry.line}`);
    if (!themes.has(entry.theme)) throw new Error(`Invalid Fortune Book theme: ${entry.theme}`);
    if (!tones.has(entry.tone)) throw new Error(`Invalid Fortune Book tone: ${entry.tone}`);
    ids.add(entry.id);
    lines.add(entry.line);
  }
}

if (contentPack.version !== 1 || contentPack.language !== "ru" || contentPack.entryCount !== 1200) {
  throw new Error("Unexpected Fortune Book content pack metadata.");
}

if (typeof __DEV__ !== "undefined" && __DEV__) validateFortuneBookContent(contentPack.entries);

const entries = Object.freeze(contentPack.entries.map((entry) => Object.freeze({ ...entry })));
const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

export const fortuneBookRepository = {
  entries,
  ids: Object.freeze(entries.map((entry) => entry.id)),
  getById(id: string): FortuneBookEntry | null {
    return entriesById.get(id) ?? null;
  },
};
