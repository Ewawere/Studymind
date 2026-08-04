/**
 * Natural-language insights + rolling performance trends
 */

import type {
  LearningInsights,
  PerformanceTrends,
  PeriodStats,
  UserLearningContext,
  ExamReadiness,
} from "./types";
import type { ConceptSnapshot } from "./recommendations";
import type { SubjectRollup } from "./analytics";

export interface AttemptPoint {
  isCorrect: boolean;
  createdAt: Date;
  timeSpentMs?: number | null;
  subjectId?: string | null;
  subjectName?: string | null;
}

export interface InsightInput {
  concepts: ConceptSnapshot[];
  subjects: SubjectRollup[];
  attempts: AttemptPoint[];
  currentStreak: number;
  longestStreak: number;
  readiness: ExamReadiness;
  ctx: UserLearningContext;
  now?: Date;
}

function periodStats(
  attempts: AttemptPoint[],
  concepts: ConceptSnapshot[],
  days: 7 | 30 | 90,
  now: Date
): PeriodStats {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const window = attempts.filter((a) => a.createdAt >= cutoff);
  const correct = window.filter((a) => a.isCorrect).length;
  const attempted = window.length;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  // Approximate study minutes from timeSpentMs
  const studyMinutes = Math.round(
    window.reduce((s, a) => s + (a.timeSpentMs ?? 0), 0) / 60000
  );

  const mastered = concepts.filter((c) => c.attemptCount > 0);
  const averageMastery =
    mastered.length > 0
      ? mastered.reduce((s, c) => s + c.masteryScore, 0) / mastered.length
      : null;

  return {
    days,
    attempted,
    correct,
    accuracy: Math.round(accuracy * 10) / 10,
    averageMastery:
      averageMastery != null ? Math.round(averageMastery * 10) / 10 : null,
    studyMinutes,
  };
}

export function buildPerformanceTrends(
  attempts: AttemptPoint[],
  concepts: ConceptSnapshot[],
  now: Date = new Date()
): PerformanceTrends {
  const last7Days = periodStats(attempts, concepts, 7, now);
  const last30Days = periodStats(attempts, concepts, 30, now);
  const last90Days = periodStats(attempts, concepts, 90, now);

  let direction: PerformanceTrends["direction"] = "unknown";
  if (last7Days.attempted >= 5 && last30Days.attempted >= 10) {
    const diff = last7Days.accuracy - last30Days.accuracy;
    if (diff > 5) direction = "improving";
    else if (diff < -5) direction = "declining";
    else direction = "stable";
  }

  return { last7Days, last30Days, last90Days, direction };
}

/**
 * Produce natural-language narratives for dashboard / AI Coach.
 */
export function generateNarratives(input: InsightInput): string[] {
  const now = input.now ?? new Date();
  const narratives: string[] = [];
  const trends = buildPerformanceTrends(input.attempts, input.concepts, now);

  // Weekly improvement
  if (
    trends.last7Days.attempted >= 5 &&
    trends.last30Days.attempted >= 10 &&
    trends.last7Days.accuracy - trends.last30Days.accuracy >= 8
  ) {
    const gain = Math.round(
      trends.last7Days.accuracy - trends.last30Days.accuracy
    );
    narratives.push(
      `You improved by about ${gain}% accuracy over the last week compared to your 30-day average.`
    );
  }

  // Subject-level speed vs struggle
  const sorted = [...input.subjects].sort((a, b) => b.mastery - a.mastery);
  if (sorted.length >= 2) {
    const strong = sorted[0];
    const weak = sorted[sorted.length - 1];
    if (strong.mastery - weak.mastery >= 20) {
      narratives.push(
        `You're strongest in ${strong.name ?? "one subject"} (${Math.round(strong.mastery)}% mastery) but still need work on ${weak.name ?? "another"} (${Math.round(weak.mastery)}%).`
      );
    }
  }

  // Confidence vs mastery mismatch
  const guessers = input.concepts.filter(
    (c) => c.masteryScore >= 70 && c.confidence < 45 && c.attemptCount >= 4
  );
  if (guessers.length > 0) {
    const names = guessers
      .slice(0, 2)
      .map((c) => c.conceptName)
      .filter(Boolean)
      .join(" and ");
    narratives.push(
      names
        ? `You often get ${names} right, but confidence is low — practice slower, deliberate reviews to lock it in.`
        : `Some topics show high accuracy but low confidence. Slow down and explain answers out loud.`
    );
  }

  // Exam readiness
  if (input.readiness.score > 0) {
    narratives.push(
      `Based on current progress, your estimated exam score is around ${input.readiness.score}%. ${input.readiness.message}`
    );
  }

  // Streak
  if (input.currentStreak >= 3) {
    narratives.push(
      `You're on a ${input.currentStreak}-day study streak. Consistency is compounding.`
    );
  } else if (input.currentStreak === 0 && input.longestStreak > 0) {
    narratives.push(
      `Your longest streak is ${input.longestStreak} days. A short session today can restart the chain.`
    );
  }

  // Goals alignment
  if (input.ctx.learningGoals && input.ctx.learningGoals.length > 0) {
    narratives.push(
      `Focus areas tied to your goals: ${input.ctx.learningGoals.slice(0, 2).join("; ")}.`
    );
  }

  // Declining trend warning
  if (trends.direction === "declining") {
    narratives.push(
      "Recent accuracy is lower than your 30-day average. Prioritise weak concepts and shorter, focused sessions."
    );
  }

  return narratives.slice(0, 6);
}

export function assembleInsights(input: InsightInput): LearningInsights {
  const now = input.now ?? new Date();
  const trends = buildPerformanceTrends(input.attempts, input.concepts, now);
  const narratives = generateNarratives(input);

  const totalAttempted = input.attempts.length;
  const totalCorrect = input.attempts.filter((a) => a.isCorrect).length;
  const totalIncorrect = totalAttempted - totalCorrect;
  const accuracy =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  const times = input.attempts
    .map((a) => a.timeSpentMs)
    .filter((t): t is number => t != null);
  const averageResponseMs =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

  const sorted = [...input.subjects].sort((a, b) => b.mastery - a.mastery);

  return {
    totalAttempted,
    totalCorrect,
    totalIncorrect,
    accuracy: Math.round(accuracy * 10) / 10,
    averageResponseMs,
    strongestSubjects: sorted.slice(0, 3).map((s) => ({
      subjectId: s.subjectId,
      name: s.name,
      mastery: Math.round(s.mastery),
    })),
    weakestSubjects: sorted
      .slice()
      .reverse()
      .slice(0, 3)
      .map((s) => ({
        subjectId: s.subjectId,
        name: s.name,
        mastery: Math.round(s.mastery),
      })),
    currentStreak: input.currentStreak,
    longestStreak: input.longestStreak,
    estimatedExamScore: input.readiness.score,
    masteryTrend: trends.direction,
    narratives,
    trends,
  };
}
