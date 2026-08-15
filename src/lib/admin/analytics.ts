/**
 * Platform analytics for operators.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";

export async function getPlatformAnalytics(actor: AdminActor) {
  assertPermission(actor, "analytics.read");

  const now = new Date();
  const day = new Date(now);
  day.setDate(day.getDate() - 1);
  const week = new Date(now);
  week.setDate(week.getDate() - 7);
  const month = new Date(now);
  month.setDate(month.getDate() - 30);

  const [
    dau,
    wau,
    mau,
    questionsAnswered30d,
    practiceSessions30d,
    examSessions30d,
    tutorUsage30d,
    byCurriculum,
    topQuestions,
  ] = await Promise.all([
    prisma.user.count({ where: { lastStudyDate: { gte: day } } }),
    prisma.user.count({ where: { lastStudyDate: { gte: week } } }),
    prisma.user.count({ where: { lastStudyDate: { gte: month } } }),
    prisma.questionAttempt.count({ where: { createdAt: { gte: month } } }),
    prisma.quizAttempt.count({
      where: {
        startedAt: { gte: month },
        mode: { in: ["practice", "weakness", "revision", "challenge"] },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        startedAt: { gte: month },
        mode: {
          in: ["exam", "waec", "jamb", "mock", "practice_exam", "post_utme"],
        },
      },
    }),
    prisma.conversation.count({ where: { createdAt: { gte: month } } }),
    prisma.user.groupBy({
      by: ["curriculumId"],
      _count: { _all: true },
    }),
    prisma.questionStatistics.findMany({
      orderBy: { totalAttempts: "desc" },
      take: 10,
      include: {
        question: { select: { stem: true, subjectId: true } },
      },
    }),
  ]);

  return {
    activeUsers: { dau, wau, mau },
    questionsAnswered30d,
    practiceSessions30d,
    examSessions30d,
    tutorUsage30d,
    curriculumUsage: byCurriculum,
    topQuestions: topQuestions.map((q) => ({
      questionId: q.questionId,
      stem: q.question.stem.slice(0, 120),
      attempts: q.totalAttempts,
      correctRate:
        q.totalAttempts > 0
          ? Math.round((q.correctCount / q.totalAttempts) * 1000) / 10
          : 0,
    })),
  };
}
