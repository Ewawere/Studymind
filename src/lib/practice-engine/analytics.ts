/**
 * Per-session analytics report
 */

import { prisma } from "@/lib/prisma";
import type { SessionReport, SessionMode } from "./types";

export async function buildSessionReport(
  sessionId: string
): Promise<SessionReport> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: sessionId },
  });

  const attempts = await prisma.questionAttempt.findMany({
    where: { quizAttemptId: sessionId },
    include: {
      question: {
        select: {
          conceptId: true,
          concept: { select: { name: true } },
        },
      },
    },
  });

  const answered = attempts.filter((a) => !a.skipped);
  const correct = answered.filter((a) => a.isCorrect).length;
  const accuracy = answered.length > 0 ? correct / answered.length : 0;

  const times = answered
    .map((a) => a.timeSpentMs)
    .filter((t): t is number => t != null);
  const averageResponseMs =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const timeSpentMs = times.reduce((a, b) => a + b, 0);

  // Concept breakdown
  const byConcept = new Map<
    string,
    { name?: string; correct: number; total: number }
  >();
  for (const a of answered) {
    const cid = a.question.conceptId ?? "unknown";
    const entry = byConcept.get(cid) ?? {
      name: a.question.concept?.name,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    byConcept.set(cid, entry);
  }

  const conceptStats = [...byConcept.entries()].map(([conceptId, v]) => ({
    conceptId,
    name: v.name,
    correct: v.correct,
    total: v.total,
    rate: v.total > 0 ? v.correct / v.total : 0,
  }));

  const strongestConcepts = [...conceptStats]
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 3)
    .map(({ conceptId, name, correct, total }) => ({
      conceptId,
      name,
      correct,
      total,
    }));

  const weakestConcepts = [...conceptStats]
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, 3)
    .map(({ conceptId, name, correct, total }) => ({
      conceptId,
      name,
      correct,
      total,
    }));

  const recommendedNextTopics = weakestConcepts
    .map((c) => c.name)
    .filter(Boolean) as string[];

  let improvementNote: string | undefined;
  if (accuracy >= 0.9) {
    improvementNote = "Excellent session — keep the streak going.";
  } else if (accuracy >= 0.7) {
    improvementNote = "Solid work. Focus next on the weakest concepts above.";
  } else if (answered.length > 0) {
    improvementNote =
      "This session exposed gaps. A Weakness Mode session is recommended next.";
  }

  return {
    sessionId,
    mode: session.mode as SessionMode,
    score: Math.round(accuracy * 1000) / 10,
    accuracy: Math.round(accuracy * 1000) / 10,
    totalQuestions: session.totalQuestions,
    correctCount: correct,
    skippedCount: session.skippedCount,
    timeSpentMs,
    averageResponseMs,
    xpEarned: session.xpEarned,
    strongestConcepts,
    weakestConcepts,
    recommendedNextTopics,
    improvementNote,
  };
}
