import { describe, expect, it } from "vitest";

import {
  PersistentShuffleBag,
  type KeyValueStorage,
  type PredictionEntry,
  type RandomSource,
} from "./persistent-shuffle-bag";

const STORAGE_KEY = "prediction-deck-test";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  writes = 0;

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.writes += 1;
    this.values.set(key, value);
  }
}

function entries(count: number): PredictionEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `prediction-${index + 1}`,
    text: `Prediction ${index + 1}`,
    category: "general",
    tone: "reflective",
  }));
}

function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("PersistentShuffleBag", () => {
  it("does not consume a prediction when aborted before reveal", async () => {
    const storage = new MemoryStorage();
    const deck = new PersistentShuffleBag(entries(12), storage, STORAGE_KEY, 4, seededRandom(1));

    await deck.reserve();
    await deck.abort();

    expect(storage.writes).toBe(0);
    expect(storage.values.has(STORAGE_KEY)).toBe(false);
  });

  it("commits the reserved prediction only at the reveal checkpoint", async () => {
    const storage = new MemoryStorage();
    const deck = new PersistentShuffleBag(entries(12), storage, STORAGE_KEY, 4, seededRandom(2));

    const reserved = await deck.reserve();
    expect(storage.writes).toBe(0);

    const committed = await deck.commit();
    const state = JSON.parse(storage.values.get(STORAGE_KEY)!);
    expect(committed?.id).toBe(reserved.id);
    expect(state.remainingIds).toHaveLength(11);
    expect(state.recentIds).toEqual([reserved.id]);
  });

  it("returns 600 unique predictions before reshuffling", async () => {
    const storage = new MemoryStorage();
    const deck = new PersistentShuffleBag(entries(600), storage, STORAGE_KEY, 40, seededRandom(3));
    const issuedIds: string[] = [];

    for (let index = 0; index < 600; index += 1) {
      issuedIds.push((await deck.reserve()).id);
      await deck.commit();
    }

    expect(new Set(issuedIds).size).toBe(600);
  });

  it("keeps the previous 40 recent IDs out of the next cycle's first 40 positions", async () => {
    const storage = new MemoryStorage();
    const deck = new PersistentShuffleBag(entries(600), storage, STORAGE_KEY, 40, seededRandom(4));
    const firstCycle: string[] = [];

    for (let index = 0; index < 600; index += 1) {
      firstCycle.push((await deck.reserve()).id);
      await deck.commit();
    }

    const recentIds = new Set(firstCycle.slice(-40));
    const nextCyclePrefix: string[] = [];
    for (let index = 0; index < 40; index += 1) {
      nextCyclePrefix.push((await deck.reserve()).id);
      await deck.commit();
    }

    expect(nextCyclePrefix.every((id) => !recentIds.has(id))).toBe(true);
  });

  it("restores the remaining deck after an app restart", async () => {
    const storage = new MemoryStorage();
    const firstInstance = new PersistentShuffleBag(
      entries(30),
      storage,
      STORAGE_KEY,
      5,
      seededRandom(5),
    );

    for (let index = 0; index < 8; index += 1) {
      await firstInstance.reserve();
      await firstInstance.commit();
    }
    const expectedNext = await firstInstance.reserve();
    await firstInstance.abort();

    const restartedInstance = new PersistentShuffleBag(
      entries(30),
      storage,
      STORAGE_KEY,
      5,
      seededRandom(999),
    );
    const restoredNext = await restartedInstance.reserve();

    expect(restoredNext.id).toBe(expectedNext.id);
  });

  it("migrates content updates without resetting valid remaining IDs", async () => {
    const storage = new MemoryStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        knownIds: ["prediction-1", "prediction-2", "prediction-3", "prediction-4"],
        remainingIds: ["prediction-2", "prediction-3", "prediction-4"],
        recentIds: ["prediction-1"],
      }),
    );
    const updatedEntries = entries(6).filter((entry) => entry.id !== "prediction-3");
    const deck = new PersistentShuffleBag(
      updatedEntries,
      storage,
      STORAGE_KEY,
      4,
      seededRandom(6),
    );

    await deck.prepare();

    const state = JSON.parse(storage.values.get(STORAGE_KEY)!);
    expect(state.remainingIds).not.toContain("prediction-3");
    expect(state.remainingIds).toEqual(expect.arrayContaining(["prediction-2", "prediction-4"]));
    expect(state.remainingIds).toEqual(expect.arrayContaining(["prediction-5", "prediction-6"]));
    expect(state.remainingIds.indexOf("prediction-2")).toBeLessThan(
      state.remainingIds.indexOf("prediction-4"),
    );
    expect(state.knownIds).toEqual(updatedEntries.map((entry) => entry.id));
    expect(state.recentIds).toEqual(["prediction-1"]);
  });
});

