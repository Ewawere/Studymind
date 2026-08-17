/**
 * Performance analytics across practice + exams.
 */

import { prisma } from "@/lib/prisma";
import {
  accuracyOf,
  averageMs,
  groupBy,
  improvementRate,
  type AttemptRow,
} from "./aggregation";
import type { PerformanceReport, PerformanceSlice } from "./types";

function toSlice(
  key: string,
  label: string,
  rows: AttemptRow[]
): PerformanceSlice {
  return {
    key,
    label,
    attempted: rows.length,
    correct: rows.filter((r) => r.isCorrect).length,
    accuracy: Math.round(accuracyOf(rows) * 1000) / 10,
    averageMs: averageMs(rows),
  };
}

export async function getPerformanceReport(
  userId: string
): Promise<PerformanceReport> {
  const [attempts, sessions] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: { userId },
      select: {
        isCorrect: true,
        skipped: true,
        timeSpentMs: true,
        createdAt: true,
        question: {
          select: {
            subjectId: true,
            topicId: true,
            conceptId: true,
            authorDifficulty: true,
            subject: { select: { name: true } },
            topic: { select: { name: true } },
            concept: { select: { name: true } },
          },
        },
      },
      take: 5000,
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      select: { mode: true, status: true },
    }),
  ]);

  const answered = attempts.filter((a) => !a.skipped);
  const rows: (AttemptRow & {
    subjectName?: string;
    topicName?: string;
    conceptName?: string;
  })[] = answered.map((a) => ({
    isCorrect: a.isCorrect,
    skipped: a.skipped,
    timeSpentMs: a.timeSpentMs,
    createdAt: a.createdAt,
    subjectId: a.question.subjectId,
    topicId: a.question.topicId,
    conceptId: a.question.conceptId,
    difficulty: a.question.authorDifficulty,
    subjectName: a.question.subject.name,
    topicName: a.question.topic?.name,
    conceptName: a.question.concept?.name,
  }));

  const bySubject = [...groupBy(rows, (r) => r.subjectId ?? "_")].map(
    ([key, list]) =>
      toSlice(key, list[0]?.subjectName ?? key, list)
  );
  const byTopic = [...groupBy(rows, (r) => r.topicId ?? "_")]
    .filter(([k]) => k !== "_")
    .map(([key, list]) => toSlice(key, list[0]?.topicName ?? key, list))
    .slice(0, 20);
  const byConcept = [...groupBy(rows, (r) => r.conceptId ?? "_")]
    .filter(([k]) => k !== "_")
    .map(([key, list]) => toSlice(key, list[0]?.conceptName ?? key, list))
    .slice(0, 30);
  const byDifficulty = [...groupBy(rows, (r) => String(r.difficulty ?? 3))].map(
    ([key, list]) => toSlice(key, `Difficulty ${key}`, list)
  );

  const skipRate =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((a) => a.skipped).length / attempts.length) * 1000
        ) / 10
      : 0;

  // Guess proxy: correct + very fast (< 5s)
  const fastCorrect = answered.filter(
    (a) => a.isCorrect && (a.timeSpentMs ?? 99999) < 5000
  ).length;
  const guessProxy =
    answered.length > 10
      ? Math.round((fastCorrect / answered.length) * 1000) / 10
      : null;

  const practiceSessions = sessions.filter(
    (s) =>
      ["practice", "weakness", "revision", "challenge", "tutor"].includes(
        s.mode
      ) && s.status === "completed"
  ).length;
  const examSessions = sessions.filter(
    (s) =>
      ["practice_exam", "waec", "jamb", "post_utme", "mock", "exam"].includes(
        s.mode
      ) && ["submitted", "completed"].includes(s.status)
  ).length;

  const report: PerformanceReport = {
    bySubject,
    byTopic,
    byConcept,
    byDifficulty,
    skipRate,
    guessHeuristic: guessProxy,
    practiceSessions,
    examSessions,
    improvementRate: improvementRate(rows),
  };

  return report;
}
