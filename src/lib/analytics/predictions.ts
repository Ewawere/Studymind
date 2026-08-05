/**
 * Lightweight predictions from mastery + accuracy trends.
 * Not a black-box model — transparent heuristics suitable for MVP.
 */

import { prisma } from "@/lib/prisma";
import { calculateExamReadiness } from "@/lib/learning-brain";
import { platformConfig } from "@/lib/platform";
import { accuracyOf, improvementRate, type AttemptRow } from "./aggregation";
import type { Prediction } from "./types";

export async function getPrediction(userId: string): Promise<Prediction> {
  const [readiness, user, subjectMasteries, attempts, weakStates] =
    await Promise.all([
      calculateExamReadiness(userId).catch(() => null),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.subjectMastery.findMany({ where: { userId } }),
      prisma.questionAttempt.findMany({
        where: { userId, skipped: false },
        select: { isCorrect: true, timeSpentMs: true, createdAt: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      }),
      prisma.conceptState.findMany({
        where: {
          userId,
          masteryScore: { lt: platformConfig.weakMasteryThreshold },
        },
        include: { concept: true },
        orderBy: { masteryScore: "asc" },
        take: 5,
      }),
    ]);

  const rows: AttemptRow[] = attempts.map((a) => ({
    isCorrect: a.isCorrect,
    timeSpentMs: a.timeSpentMs,
    createdAt: a.createdAt,
  }));

  const overallAccuracy = accuracyOf(rows);
  const avgMastery =
    subjectMasteries.length > 0
      ? subjectMasteries.reduce((s, m) => s + m.masteryScore, 0) /
        subjectMasteries.length
      : overallAccuracy * 100;

  const readinessScore =
    readiness?.score ?? Math.round(0.6 * avgMastery + 0.4 * overallAccuracy * 100);

  // Blend readiness with recent accuracy for expected score
  const expectedExamScore = Math.round(
    Math.min(100, Math.max(0, 0.7 * readinessScore + 0.3 * overallAccuracy * 100))
  );

  const passProbability = Math.min(
    0.99,
    Math.max(
      0.01,
      1 / (1 + Math.exp(-(expectedExamScore - platformConfig.passThresholdPct) / 8))
    )
  );

  const trend = improvementRate(rows);
  const notes: string[] = [];
  if (trend != null && trend > 0.05) notes.push("Accuracy is trending upward.");
  if (trend != null && trend < -0.05) notes.push("Accuracy dipped recently — prioritize revision.");
  if (user.currentStreak >= 7) notes.push("Strong consistency streak supports retention.");
  if (weakStates.length >= 3) notes.push("Several weak concepts need focused practice.");

  // Days to reach 75% avg mastery at current weekly pace
  let estimatedMasteryDays: number | null = null;
  const gap = Math.max(0, platformConfig.strongMasteryThreshold - avgMastery);
  const weeklyQ = rows.filter(
    (r) => Date.now() - r.createdAt.getTime() < 7 * 86400000
  ).length;
  if (gap > 0 && weeklyQ > 10) {
    // Rough: ~2 mastery points per 10 quality questions
    const pointsPerWeek = Math.max(1, (weeklyQ / 10) * 2);
    estimatedMasteryDays = Math.ceil((gap / pointsPerWeek) * 7);
  }

  const recommendedStudyHoursPerWeek = Math.min(
    20,
    Math.max(
      3,
      Math.round(((user.dailyStudyTargetMin ?? 45) * 7) / 60)
    )
  );

  return {
    expectedExamScore,
    passProbability: Math.round(passProbability * 1000) / 10 / 100,
    readinessScore: Math.round(readinessScore * 10) / 10,
    weakestFutureTopics: weakStates.map((s) => s.concept.name),
    estimatedMasteryDays,
    recommendedStudyHoursPerWeek,
    confidence: rows.length >= 50 ? 0.75 : rows.length >= 15 ? 0.55 : 0.35,
    notes,
  };
}
