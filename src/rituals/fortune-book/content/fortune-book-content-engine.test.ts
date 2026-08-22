import { describe, expect, it } from "vitest";

import type { KeyValueStorage, RandomSource } from "@/predictions/persistent-shuffle-bag";

import { FortuneBookContentEngine } from "./fortune-book-content-engine";
import { fortuneBookRepository, validateFortuneBookContent } from "./fortune-book-repository";

const STORAGE_KEY = "fortune-book-test";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createEngine(storage = new MemoryStorage(), seed = 1) {
  return {
    storage,
    engine: new FortuneBookContentEngine(
      fortuneBookRepository.entries,
      storage,
      STORAGE_KEY,
      seededRandom(seed),
    ),
  };
}

async function collectFullCycle(engine: FortuneBookContentEngine) {
  const ids: string[] = [];
  for (let index = 0; index < 60; index += 1) {
    ids.push(...(await engine.createNextSpread()).entries.map((entry) => entry.id));
  }
  return ids;
}

describe("FortuneBookContentEngine", () => {
  it("validates the immutable 1200-entry content pack", () => {
    expect(() => validateFortuneBookContent(fortuneBookRepository.entries)).not.toThrow();
    expect(fortuneBookRepository.entries).toHaveLength(1200);
  });

  it("returns 1200 entries across exactly 60 spreads", async () => {
    const { engine } = createEngine(undefined, 2);
    const ids = await collectFullCycle(engine);
    expect(ids).toHaveLength(1200);
    expect((await engine.getDiagnostics()).spread).toBe(60);
  });

  it("has 1200 unique IDs after a full cycle", async () => {
    const { engine } = createEngine(undefined, 22);
    const ids = await collectFullCycle(engine);
    expect(new Set(ids).size).toBe(1200);
  });

  it("starts cycle two on the 61st spread", async () => {
    const { engine } = createEngine(undefined, 3);
    for (let index = 0; index < 60; index += 1) await engine.createNextSpread();
    const spread = await engine.createNextSpread();
    expect(spread.cycle).toBe(2);
    expect(spread.spread).toBe(1);
  });

  it("keeps the previous cycle's last 40 IDs out of the new cycle's first 40", async () => {
    const { engine } = createEngine(undefined, 4);
    const firstCycle: string[] = [];
    for (let index = 0; index < 60; index += 1) {
      firstCycle.push(...(await engine.createNextSpread()).entries.map((entry) => entry.id));
    }
    const recent = new Set(firstCycle.slice(-40));
    const nextPrefix = [
      ...(await engine.createNextSpread()).entries,
      ...(await engine.createNextSpread()).entries,
    ].map((entry) => entry.id);
    expect(nextPrefix.every((id) => !recent.has(id))).toBe(true);
  });

  it("restores the cursor after an app restart", async () => {
    const { storage, engine } = createEngine(undefined, 5);
    const issued = new Set<string>();
    for (let index = 0; index < 3; index += 1) {
      (await engine.createNextSpread()).entries.forEach((entry) => issued.add(entry.id));
    }
    const restarted = new FortuneBookContentEngine(
      fortuneBookRepository.entries,
      storage,
      STORAGE_KEY,
      seededRandom(999),
    );
    const next = await restarted.createNextSpread();
    expect(next.entries.every((entry) => !issued.has(entry.id))).toBe(true);
    expect((await restarted.getDiagnostics()).cursor).toBe(80);
  });

  it("returns disjoint consecutive spreads", async () => {
    const { engine } = createEngine(undefined, 6);
    const first = await engine.createNextSpread();
    const second = await engine.createNextSpread();
    const firstIds = new Set(first.entries.map((entry) => entry.id));
    expect(second.entries.every((entry) => !firstIds.has(entry.id))).toBe(true);
  });

  it("splits every spread into ten unique entries per page", async () => {
    const { engine } = createEngine(undefined, 7);
    const spread = await engine.createNextSpread();
    expect(spread.left).toHaveLength(10);
    expect(spread.right).toHaveLength(10);
    expect(new Set([...spread.left, ...spread.right].map((entry) => entry.id)).size).toBe(20);
    expect(spread.entries).toEqual([...spread.left, ...spread.right]);
  });

  it("maps a displayed ID to its exact interpretation", async () => {
    const { engine } = createEngine(undefined, 8);
    const displayed = (await engine.createNextSpread()).entries[13];
    const selected = engine.getById(displayed.id);
    expect(selected).toBe(displayed);
    expect(selected?.interpretation).toBe(displayed.interpretation);
    expect(selected?.line).toBe(displayed.line);
  });

  it("safely resets corrupted persisted state", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, "{broken-json");
    const { engine } = createEngine(storage, 9);
    const diagnostics = await engine.initialize();
    const persisted = JSON.parse(storage.values.get(STORAGE_KEY)!);
    expect(diagnostics).toMatchObject({ cycle: 1, cursor: 0, total: 1200, remaining: 1200 });
    expect(persisted.order).toHaveLength(1200);
    expect(new Set(persisted.order).size).toBe(1200);
  });
});
