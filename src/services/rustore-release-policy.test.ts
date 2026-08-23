import { describe, expect, it } from "vitest";

import {
  REVIEW_MIN_COMPLETED_RITUALS,
  REVIEW_RETRY_MS,
  shouldRequestReview,
} from "./rustore-release-policy";

describe("RuStore review policy", () => {
  it("waits for several completed rituals", () => {
    expect(shouldRequestReview({
      completedRituals: REVIEW_MIN_COMPLETED_RITUALS - 1,
      lastAttemptAt: 0,
      now: Date.now(),
    })).toBe(false);
  });

  it("allows the first eligible request", () => {
    expect(shouldRequestReview({
      completedRituals: REVIEW_MIN_COMPLETED_RITUALS,
      lastAttemptAt: 0,
      now: Date.now(),
    })).toBe(true);
  });

  it("waits three days between attempts", () => {
    const now = Date.now();
    expect(shouldRequestReview({
      completedRituals: 20,
      lastAttemptAt: now - REVIEW_RETRY_MS + 1,
      now,
    })).toBe(false);
    expect(shouldRequestReview({
      completedRituals: 20,
      lastAttemptAt: now - REVIEW_RETRY_MS,
      now,
    })).toBe(true);
  });
});
