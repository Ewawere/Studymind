/**
 * Forgetting curve / retention estimates
 *
 * Complements SM-2 scheduling with a continuous retention %
 * so the planner and AI Tutor can intervene before knowledge fades.
 *
 * Model: exponential decay R(t) = R0 * e^(-t / S)
 * where S (stability) is derived from SM-2 interval + ease factor.
 */

import type { RetentionEstimate, SM2State } from "./types";

const FORGET_THRESHOLD = 0.4; // 40% retention

/**
 * Estimate current and near-future retention for a concept.
 */
export function estimateRetention(
  sm2: SM2State,
  masteryScore: number,
  now: Date = new Date()
): RetentionEstimate {
  // Never reviewed → no retention signal
  if (!sm2.lastReviewedAt || sm2.repetitions === 0) {
    return {
      currentRetention: masteryScore > 0 ? Math.min(masteryScore, 60) : 0,
      retentionTomorrow: masteryScore > 0 ? Math.min(masteryScore, 55) : 0,
      estimatedForgetDate: null,
    };
  }

  const hoursSince =
    (now.getTime() - sm2.lastReviewedAt.getTime()) / (1000 * 60 * 60);
  const daysSince = hoursSince / 24;

  // Stability (days): longer intervals + higher EF → more stable memory
  const stability = Math.max(
    0.5,
    sm2.intervalDays * (sm2.easeFactor / 2.5) * 0.9
  );

  // Initial retention after a successful review scales with mastery
  const r0 = clamp(masteryScore / 100, 0.3, 1);

  const current = r0 * Math.exp(-daysSince / stability);
  const tomorrow = r0 * Math.exp(-(daysSince + 1) / stability);

  // When does retention hit the forget threshold?
  let estimatedForgetDate: Date | null = null;
  if (current > FORGET_THRESHOLD) {
    // t = -S * ln(threshold / R0)
    const tDays = -stability * Math.log(FORGET_THRESHOLD / r0);
    if (Number.isFinite(tDays) && tDays > daysSince) {
      estimatedForgetDate = new Date(sm2.lastReviewedAt);
      estimatedForgetDate.setDate(
        estimatedForgetDate.getDate() + Math.ceil(tDays)
      );
    }
  } else {
    estimatedForgetDate = now; // already below threshold
  }

  return {
    currentRetention: roundPct(current * 100),
    retentionTomorrow: roundPct(tomorrow * 100),
    estimatedForgetDate,
  };
}

/**
 * Should we surface a proactive review before SM-2 due date?
 * True when retention is projected to drop below 50% within 24h
 * while the card is not yet due.
 */
export function needsProactiveReview(
  sm2: SM2State,
  masteryScore: number,
  now: Date = new Date()
): boolean {
  if (!sm2.nextReviewAt) return false;
  if (sm2.nextReviewAt.getTime() <= now.getTime()) return false; // already due

  const { retentionTomorrow } = estimateRetention(sm2, masteryScore, now);
  return retentionTomorrow < 50;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundPct(n: number): number {
  return Math.round(clamp(n, 0, 100) * 10) / 10;
}
