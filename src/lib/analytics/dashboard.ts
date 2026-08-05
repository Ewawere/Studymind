/**
 * Student dashboard — single call for home screen.
 */

import { prisma } from "@/lib/prisma";
import {
  calculateExamReadiness,
  generateLearningInsights,
} from "@/lib/learning-brain";
import { cached, cacheKey, platformConfig } from "@/lib/platform";
import { dailyBuckets, type AttemptRow } from "./aggregation";
import { getAnalyticsRecommendations } from "./recommendations";
import type { StudentDashboard } from "./types";

export async function getStudentDashboard(
  userId: string
): Promise<StudentDashboard> {
  return cached(
    cacheKey(["dashboard", userId]),
    platformConfig.dashboardCacheTtlSec,
    () => loadDashboard(userId)
  );
}

async function loadDashboard(userId: string): Promise<StudentDashboard> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [
    user,
    subjectMasteries,
    conceptStates,
    attemptAgg,
    recentAttempts,
    dueCount,
    readiness,
    insights,
    recs,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.subjectMastery.findMany({
      where: { userId },
      include: { subject: true },
    }),
    prisma.conceptState.findMany({
      where: { userId },
      include: { concept: true },
      orderBy: { masteryScore: "asc" },
    }),
    prisma.questionAttempt.aggregate({
      where: { userId, skipped: false },
      _count: { _all: true },
      _avg: { timeSpentMs: true },
    }),
    prisma.questionAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: {
        isCorrect: true,
        skipped: true,
        timeSpentMs: true,
        createdAt: true,
      },
    }),
    prisma.conceptState.count({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        repetitions: { gt: 0 },
      },
    }),
    calculateExamReadiness(userId).catch(() => null),
    generateLearningInsights(userId).catch(() => null),
    getAnalyticsRecommendations(userId).catch(() => []),
  ]);

  const correctCount = await prisma.questionAttempt.count({
    where: { userId, isCorrect: true, skipped: false },
  });

  const answered = attemptAgg._count._all;
  const accuracy = answered > 0 ? correctCount / answered : 0;

  const overallMastery =
    subjectMasteries.length > 0
      ? subjectMasteries.reduce((s, m) => s + m.masteryScore, 0) /
        subjectMasteries.length
      : 0;
  const overallConfidence =
    conceptStates.length > 0
      ? conceptStates.reduce((s, c) => s + c.confidence, 0) /
        conceptStates.length
      : 0;

  const rows: AttemptRow[] = recentAttempts.map((a) => ({
    isCorrect: a.isCorrect,
    skipped: a.skipped,
    timeSpentMs: a.timeSpentMs,
    createdAt: a.createdAt,
  }));

  return {
    userId,
    overallMastery: Math.round(overallMastery * 10) / 10,
    overallConfidence: Math.round(overallConfidence * 10) / 10,
    examReadiness: readiness?.score ?? null,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    xp: user.xp,
    playerLevel: user.playerLevel,
    totalStudyMinutes: user.totalStudyMinutes,
    questionsAnswered: answered,
    questionsCorrect: correctCount,
    accuracy: Math.round(accuracy * 1000) / 10,
    averageResponseMs: attemptAgg._avg.timeSpentMs,
    subjectMasteries: subjectMasteries.map((m) => ({
      subjectId: m.subjectId,
      name: m.subject.name,
      mastery: m.masteryScore,
      confidence: m.confidence,
      attempted: m.questionsAttempted,
      correct: m.questionsCorrect,
    })),
    weakConcepts: conceptStates.slice(0, 5).map((c) => ({
      conceptId: c.conceptId,
      name: c.concept.name,
      mastery: c.masteryScore,
      confidence: c.confidence,
    })),
    strongConcepts: [...conceptStates]
      .sort((a, b) => b.masteryScore - a.masteryScore)
      .slice(0, 5)
      .map((c) => ({
        conceptId: c.conceptId,
        name: c.concept.name,
        mastery: c.masteryScore,
      })),
    weeklyActivity: dailyBuckets(rows, 7).map((b) => ({
      date: b.date,
      questions: b.questions,
      minutes: b.minutes,
    })),
    upcomingReviews: dueCount,
    recommendedNext: recs.slice(0, 5).map((r) => ({
      type: r.kind,
      title: r.title,
      reason: r.reason,
      priority: r.priority,
    })),
    narratives: insights?.narratives?.slice(0, 4) ?? [],
  };
}
