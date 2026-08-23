export const REVIEW_MIN_COMPLETED_RITUALS = 5;
export const REVIEW_RETRY_MS = 3 * 24 * 60 * 60 * 1000;

type ReviewEligibility = {
  completedRituals: number;
  lastAttemptAt: number;
  now: number;
};

export function shouldRequestReview({
  completedRituals,
  lastAttemptAt,
  now,
}: ReviewEligibility) {
  if (completedRituals < REVIEW_MIN_COMPLETED_RITUALS) return false;
  if (lastAttemptAt > 0 && now - lastAttemptAt < REVIEW_RETRY_MS) return false;
  return true;
}
