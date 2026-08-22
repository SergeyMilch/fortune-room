export const FORTUNE_BOOK_THEMES = [
  "action", "caution", "change", "choice", "fortune", "inner", "loss", "meeting",
  "money", "obstacle", "opportunity", "past", "relationship", "release", "return",
  "secret", "timing", "uncertainty", "waiting", "work",
] as const;

export const FORTUNE_BOOK_TONES = [
  "cautionary", "dark", "hopeful", "mysterious", "neutral",
] as const;

export type FortuneBookTheme = (typeof FORTUNE_BOOK_THEMES)[number];
export type FortuneBookTone = (typeof FORTUNE_BOOK_TONES)[number];

export type FortuneBookEntry = {
  id: string;
  line: string;
  interpretation: string;
  theme: FortuneBookTheme;
  tone: FortuneBookTone;
};

export type FortuneBookSpread = {
  cycle: number;
  spread: number;
  entries: FortuneBookEntry[];
  left: FortuneBookEntry[];
  right: FortuneBookEntry[];
};

export type FortuneBookShuffleState = {
  version: 1;
  cycle: number;
  order: string[];
  cursor: number;
  recentIds: string[];
};

export type FortuneBookDiagnostics = {
  cycle: number;
  cursor: number;
  total: number;
  spread: number;
  remaining: number;
  selected: string | null;
};
