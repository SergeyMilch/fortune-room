import { describe, expect, it } from "vitest";

import {
  PersistentShuffleBag,
  type KeyValueStorage,
  type RandomSource,
} from "../../../predictions/persistent-shuffle-bag";

import { fortuneCookieRepository, validateFortuneCookieContent } from "./fortune-cookie-repository";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
}

function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function createDeck(storage = new MemoryStorage(), seed = 1) {
  return {
    storage,
    deck: new PersistentShuffleBag(
      fortuneCookieRepository.entries,
      storage,
      "fortune-cookie-test",
      30,
      seededRandom(seed),
    ),
  };
}

async function consume(deck: PersistentShuffleBag) {
  const entry = await deck.reserve();
  await deck.commit();
  return entry;
}

describe("Fortune Cookie content", () => {
  it("validates all 700 unique short entries", () => {
    expect(() => validateFortuneCookieContent(fortuneCookieRepository.entries)).not.toThrow();
    expect(new Set(fortuneCookieRepository.entries.map((entry) => entry.text)).size).toBe(700);
  });

  it("uses every entry exactly once per cycle", async () => {
    const { deck } = createDeck(undefined, 2);
    const ids: string[] = [];
    for (let index = 0; index < 700; index += 1) ids.push((await consume(deck)).id);
    expect(new Set(ids).size).toBe(700);
  });

  it("protects the previous 30 entries at the cycle boundary", async () => {
    const { deck } = createDeck(undefined, 3);
    const firstCycle: string[] = [];
    for (let index = 0; index < 700; index += 1) firstCycle.push((await consume(deck)).id);
    const recent = new Set(firstCycle.slice(-30));
    const nextPrefix: string[] = [];
    for (let index = 0; index < 30; index += 1) nextPrefix.push((await consume(deck)).id);
    expect(nextPrefix.every((id) => !recent.has(id))).toBe(true);
  });

  it("restores the next entry after restart", async () => {
    const { deck, storage } = createDeck(undefined, 4);
    for (let index = 0; index < 12; index += 1) await consume(deck);
    const expected = await deck.reserve();
    await deck.abort();
    const restarted = createDeck(storage, 999).deck;
    expect((await restarted.reserve()).id).toBe(expected.id);
  });
});
