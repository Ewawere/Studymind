/**
 * Topic / Concept Mastery Engine
 *
 * Pure functions that compute mastery scores (0–100).
 * Designed so difficulty, speed, and history all influence the delta.
 */

import type { MasteryInput, MasteryResult } from "./types";

const MIN_MASTERY = 0;
const MAX_MASTERY = 100;

/**
 * Compute new mastery after a single attempt.
 *
 * Design principles:
 * - Correct answers on harder questions yield larger gains
 * - Fast correct answers yield a small bonus
 * - Incorrect answers on easy questions yield larger penalties
 * - Early attempts move the needle more than later ones (diminishing returns)
 * - Mastery never jumps more than ~12 points in one step (stability)
 */
export function calculateTopicMastery(input: MasteryInput): MasteryResult {
  const {
    previousMastery,
    isCorrect,
    difficulty,
    timeSpentMs,
    estimatedTimeSec,
    attemptCount = 0,
  } = input;

  const clampedDiff = clamp(difficulty, 1, 5);
  const prev = clamp(previousMastery, MIN_MASTERY, MAX_MASTERY);

  // Base delta
  let delta: number;

  if (isCorrect) {
    // Harder questions → bigger reward
    delta = 2 + clampedDiff * 1.2; // ~3.2 – 8

    // Speed bonus
    if (timeSpentMs && estimatedTimeSec && estimatedTimeSec > 0) {
      const ratio = timeSpentMs / (estimatedTimeSec * 1000);
      if (ratio <= 0.6) delta += 1.5;
      else if (ratio <= 1.0) delta += 0.5;
    }
  } else {
    // Missing easy questions hurts more
    delta = -(6 - clampedDiff * 0.8); // ~-5.2 – -2

    // Very slow + wrong → extra penalty (guessing / confusion)
    if (timeSpentMs && estimatedTimeSec && estimatedTimeSec > 0) {
      const ratio = timeSpentMs / (estimatedTimeSec * 1000);
      if (ratio > 2) delta -= 1.5;
    }
  }

  // Diminishing returns: later attempts move mastery less
  const experienceFactor = 1 / (1 + attemptCount * 0.08);
  delta *= experienceFactor;

  // Soft ceiling / floor near extremes
  if (isCorrect && prev > 80) delta *= 0.6;
  if (!isCorrect && prev < 20) delta *= 0.6;

  // Hard cap on single-step movement
  delta = clamp(delta, -12, 12);

  const masteryScore = clamp(prev + delta, MIN_MASTERY, MAX_MASTERY);

  return {
    masteryScore: round1(masteryScore),
    delta: round1(delta),
  };
}

/**
 * Apply gentle decay for concepts not reviewed in a while.
 * Call periodically (e.g. nightly job or on read).
 *
 * ~2% decay per 7 days of inactivity, capped.
 */
export function applyDecay(
  masteryScore: number,
  lastReviewedAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastReviewedAt) return masteryScore;

  const days =
    (now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (days < 7) return masteryScore;

  const weeks = Math.floor(days / 7);
  const decay = Math.min(weeks * 2, 20); // max 20 points decay
  return clamp(masteryScore - decay, MIN_MASTERY, MAX_MASTERY);
}

/**
 * Roll up concept masteries into a subject-level score.
 * Weighted average; concepts with more attempts count more.
 */
export function rollupSubjectMastery(
  concepts: { masteryScore: number; attemptCount?: number }[]
): number {
  if (concepts.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const c of concepts) {
    const w = 1 + (c.attemptCount ?? 0) * 0.1;
    weightedSum += c.masteryScore * w;
    totalWeight += w;
  }

  return round1(weightedSum / totalWeight);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
