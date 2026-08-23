import kvStore from "expo-sqlite/kv-store";

import { releaseFeatures } from "@/config/release-features";

import {
  beginRitualAttempt,
  grantRitualAttempt,
  normalizeRitualAccessState,
  recordRitualResult,
  type AttemptAccess,
  type RitualAccessState,
  type RitualId,
} from "./ritual-access";

const STORAGE_KEY = "ads.ritualAccess.v2";

class DailyRitualAccessService {
  beginAttempt(ritualId: RitualId): AttemptAccess {
    if (!releaseFeatures.rewardedGate) return "free";
    const state = this.readState();
    const result = beginRitualAttempt(state, ritualId);
    if (result.state !== state) this.writeState(result.state);
    return result.access;
  }

  recordResult(ritualId: RitualId) {
    if (!releaseFeatures.rewardedGate) return;
    const state = this.readState();
    const next = recordRitualResult(state, ritualId);
    if (next !== state) this.writeState(next);
  }

  grantAttempt(ritualId: RitualId) {
    if (!releaseFeatures.rewardedGate) return;
    const state = this.readState();
    const next = grantRitualAttempt(state, ritualId);
    if (next !== state) this.writeState(next);
  }

  private readState() {
    let parsed: unknown = null;
    try {
      const stored = kvStore.getItemSync(STORAGE_KEY);
      parsed = stored ? JSON.parse(stored) : null;
    } catch {
      parsed = null;
    }
    const state = normalizeRitualAccessState(parsed);
    if (!isSameState(parsed, state)) this.writeState(state);
    return state;
  }

  private writeState(state: RitualAccessState) {
    kvStore.setItemSync(STORAGE_KEY, JSON.stringify(state));
  }
}

function isSameState(value: unknown, normalized: RitualAccessState) {
  try {
    return JSON.stringify(value) === JSON.stringify(normalized);
  } catch {
    return false;
  }
}

export const dailyRitualAccessService = new DailyRitualAccessService();
