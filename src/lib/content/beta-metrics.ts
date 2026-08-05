/**
 * Phase 4 private beta metrics.
 */

import { prisma } from "@/lib/prisma";
import { aggregateNps } from "@/lib/feedback";

export async function getBetaMetricsSnapshot(opts?: { sinceDays?: number }) {
  const days = opts?.sinceDays ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const day1 = new Date();
  day1.setDate(day1.getDate() - 1);
  const day7 = new Date();
  day7.setDate(day7.getDate() - 7);

  const [
    dau,
    wau,
    questionsAnswered,
    practiceSessions,
    examSessions,
    tutorSessions,
    nps,
    users,
  ] = await Promise.all([
    prisma.user.count({ where: { lastStudyDate: { gte: day1 } } }),
    prisma.user.count({ where: { lastStudyDate: { gte: day7 } } }),
    prisma.questionAttempt.count({ where: { createdAt: { gte: since } } }),
    prisma.quizAttempt.count({
      where: {
        createdAt: { gte: since },
        mode: { in: ["practice", "weakness", "revision", "challenge"] },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        createdAt: { gte: since },
        mode: { in: ["exam", "waec", "jamb", "mock", "practice_exam"] },
        status: "completed",
      },
    }),
    prisma.conversation.count({ where: { createdAt: { gte: since } } }),
    aggregateNps({ sinceDays: days }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, createdAt: true, lastStudyDate: true },
    }),
  ]);

  // Approximate D1 retention among users created in window who studied next day
  let d1Retained = 0;
  let d1Eligible = 0;
  for (const u of users) {
    const ageDays =
      (Date.now() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 1) continue;
    d1Eligible++;
    if (u.lastStudyDate) {
      const delta =
        (u.lastStudyDate.getTime() - u.createdAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (delta >= 0.5 && delta < 2) d1Retained++;
    }
  }

  const avgQuestionsPerSession =
    practiceSessions > 0
      ? Math.round((questionsAnswered / practiceSessions) * 10) / 10
      : 0;

  return {
    windowDays: days,
    dau,
    wau,
    questionsAnswered,
    practiceSessions,
    examSessionsCompleted: examSessions,
    aiTutorUsage: tutorSessions,
    avgQuestionsPerSession,
    d1RetentionApprox:
      d1Eligible > 0
        ? Math.round((d1Retained / d1Eligible) * 1000) / 10
        : null,
    nps: nps.nps,
    npsResponses: nps.responses,
    qualitativePrompts: [
      "Was this explanation helpful?",
      "Was this question too easy, about right, or too difficult?",
      "Did the recommended next topic feel useful?",
    ],
  };
}
