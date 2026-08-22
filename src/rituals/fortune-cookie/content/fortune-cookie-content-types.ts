export type FortuneCookieTone =
  | "hopeful"
  | "neutral"
  | "mysterious"
  | "cautionary"
  | "playful";

export type FortuneCookieEntry = {
  id: string;
  text: string;
  category: string;
  tone: FortuneCookieTone;
};
