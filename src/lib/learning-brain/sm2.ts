/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Classic SuperMemo-2 with sensible clamps for educational use.
 * Pure functions — no database dependency.
 *
 * Quality scale (0–5):
 *   0 – complete blackout
 *   1 – incorrect; remembered after seeing answer
 *   2 – incorrect; answer seemed easy once revealed
 *   3 – correct with serious difficulty
 *   4 – correct after hesitation
 *   5 – perfect response
 */

import type { SM2Quality, SM2State, SM2UpdateResult } from "./types";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/**
 * Map a binary correct/incorrect + optional timing signal into SM-2 quality.
 */
export function deriveQuality(
  isCorrect: boolean,
  timeSpentMs?: number | null,
  estimatedTimeSec?: number | null
): SM2Quality {
  if (!isCorrect) {
    // Incorrect answers: 0–2 based on how long they struggled
    if (timeSpentMs && estimatedTimeSec) {
      const ratio = timeSpentMs / (estimatedTimeSec * 1000);
      if (ratio > 2) return 0;
      if (ratio > 1.2) return 1;
      return 2;
    }
    return 1;
  }

  // Correct: 3–5 based on speed
  if (timeSpentMs && estimatedTimeSec && estimatedTimeSec > 0) {
    const ratio = timeSpentMs / (estimatedTimeSec * 1000);
    if (ratio <= 0.5) return 5;
    if (ratio <= 1.0) return 4;
    return 3;
  }

  return 4; // default for correct without timing data
}

/**
 * Apply one SM-2 review cycle.
 */
export function scheduleNextReview(
  current: SM2State,
  quality: SM2Quality,
  now: Date = new Date()
): SM2UpdateResult {
  let { easeFactor, intervalDays, repetitions } = current;

  if (easeFactor < MIN_EASE) easeFactor = DEFAULT_EASE;

  if (quality < 3) {
    // Failed recall — reset repetition chain
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
    repetitions += 1;
  }

  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const q = quality;
  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;

  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);
  nextReviewAt.setHours(8, 0, 0, 0); // morning review window

  return {
    easeFactor: round2(easeFactor),
    intervalDays,
    repetitions,
    nextReviewAt,
    lastReviewedAt: now,
    quality,
  };
}

/**
 * Initial SM-2 state for a never-reviewed concept.
 */
export function initialSM2State(): SM2State {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
  };
}

/**
 * Is this item due for review?
 */
export function isDue(state: SM2State, now: Date = new Date()): boolean {
  if (!state.nextReviewAt) return true; // never scheduled → due
  return state.nextReviewAt.getTime() <= now.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
