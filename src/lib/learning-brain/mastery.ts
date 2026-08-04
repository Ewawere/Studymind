/**
 * Mastery + Confidence engine
 *
 * Mastery  = estimated knowledge (0–100)
 * Confidence = consistency / non-guessing signal (0–100)
 *
 * High mastery + low confidence → often correct but possibly guessing.
 */

import type { MasteryInput, MasteryResult } from "./types";

const MIN = 0;
const MAX = 100;
const RECENT_WINDOW = 10; // keep last N results

export function calculateTopicMastery(input: MasteryInput): MasteryResult {
  const {
    previousMastery,
    previousConfidence = 50,
    isCorrect,
    difficulty,
    timeSpentMs,
    estimatedTimeSec,
    attemptCount = 0,
    recentResults = "",
  } = input;

  const clampedDiff = clamp(difficulty, 1, 5);
  const prev = clamp(previousMastery, MIN, MAX);
  const prevConf = clamp(previousConfidence, MIN, MAX);

  // ── Mastery delta ──
  let delta: number;
  if (isCorrect) {
    delta = 2 + clampedDiff * 1.2;
    if (timeSpentMs && estimatedTimeSec && estimatedTimeSec > 0) {
      const ratio = timeSpentMs / (estimatedTimeSec * 1000);
      if (ratio <= 0.6) delta += 1.5;
      else if (ratio <= 1.0) delta += 0.5;
    }
  } else {
    delta = -(6 - clampedDiff * 0.8);
    if (timeSpentMs && estimatedTimeSec && estimatedTimeSec > 0) {
      const ratio = timeSpentMs / (estimatedTimeSec * 1000);
      if (ratio > 2) delta -= 1.5;
    }
  }

  const experienceFactor = 1 / (1 + attemptCount * 0.08);
  delta *= experienceFactor;
  if (isCorrect && prev > 80) delta *= 0.6;
  if (!isCorrect && prev < 20) delta *= 0.6;
  delta = clamp(delta, -12, 12);

  const masteryScore = clamp(prev + delta, MIN, MAX);

  // ── Confidence delta ──
  // Consistent correct answers raise confidence; flips and lucky-fast guesses lower it.
  let confidenceDelta = 0;
  const updatedRecent = (recentResults + (isCorrect ? "1" : "0")).slice(
    -RECENT_WINDOW
  );

  if (isCorrect) {
    confidenceDelta = 3;
    // Very fast correct on hard item → confident knowledge
    if (
      timeSpentMs &&
      estimatedTimeSec &&
      estimatedTimeSec > 0 &&
      timeSpentMs / (estimatedTimeSec * 1000) <= 0.5 &&
      clampedDiff >= 3
    ) {
      confidenceDelta += 2;
    }
    // Very fast correct on easy item after few attempts → possible luck, smaller gain
    if (attemptCount < 3 && clampedDiff <= 2) {
      confidenceDelta -= 1;
    }
  } else {
    confidenceDelta = -5;
    // Wrong after being previously correct a lot → bigger confidence hit
    const recentCorrect = (updatedRecent.match(/1/g) || []).length;
    if (recentCorrect >= updatedRecent.length * 0.7) {
      confidenceDelta -= 3;
    }
  }

  // Consistency bonus/penalty from recent window
  if (updatedRecent.length >= 5) {
    const rate =
      (updatedRecent.match(/1/g) || []).length / updatedRecent.length;
    if (rate >= 0.8) confidenceDelta += 2;
    if (rate <= 0.4) confidenceDelta -= 2;
  }

  confidenceDelta = clamp(confidenceDelta, -10, 10);
  const confidence = clamp(prevConf + confidenceDelta, MIN, MAX);

  return {
    masteryScore: round1(masteryScore),
    confidence: round1(confidence),
    delta: round1(delta),
    confidenceDelta: round1(confidenceDelta),
    recentResults: updatedRecent,
  };
}

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
  const decay = Math.min(weeks * 2, 20);
  return clamp(masteryScore - decay, MIN, MAX);
}

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

export function rollupSubjectConfidence(
  concepts: { confidence: number; attemptCount?: number }[]
): number {
  if (concepts.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of concepts) {
    const w = 1 + (c.attemptCount ?? 0) * 0.1;
    weightedSum += c.confidence * w;
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
