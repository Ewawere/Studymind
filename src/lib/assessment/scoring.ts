/**
 * Shared objective scoring utilities.
 */

import { prisma } from "@/lib/prisma";
import type { MarkedAnswer, ScoreSummary } from "./types";

export async function markObjectiveAnswer(
  questionId: string,
  selectedKey: string | null,
  timeSpentMs?: number | null
): Promise<MarkedAnswer> {
  const q = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: {
      id: true,
      correctKey: true,
      explanation: true,
      commonMistakes: true,
      learningObjectives: true,
      conceptId: true,
      topicId: true,
      subjectId: true,
      authorDifficulty: true,
      calculatedDifficulty: true,
      estimatedTimeSec: true,
    },
  });

  const isCorrect =
    selectedKey != null &&
    q.correctKey != null &&
    selectedKey.trim().toUpperCase() === q.correctKey.trim().toUpperCase();

  return {
    questionId: q.id,
    isCorrect,
    correctKey: q.correctKey,
    selectedKey,
    explanation: q.explanation,
    commonMistakes:
      (q.commonMistakes as { mistake: string; why?: string }[]) ?? [],
    learningObjectives: q.learningObjectives,
    conceptId: q.conceptId,
    topicId: q.topicId,
    subjectId: q.subjectId,
    difficulty: Math.round(q.calculatedDifficulty ?? q.authorDifficulty),
    estimatedTimeSec: q.estimatedTimeSec,
    timeSpentMs: timeSpentMs ?? null,
  };
}

export function gradeFromPercentage(pct: number): string {
  if (pct >= 75) return "A";
  if (pct >= 70) return "B";
  if (pct >= 65) return "C";
  if (pct >= 60) return "D";
  if (pct >= 50) return "E";
  return "F";
}

export function summarizeScore(input: {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  skipped: number;
}): ScoreSummary {
  const answered = input.correct + input.incorrect;
  const percentage =
    input.totalQuestions > 0
      ? (input.correct / input.totalQuestions) * 100
      : 0;
  return {
    totalQuestions: input.totalQuestions,
    answered,
    correct: input.correct,
    incorrect: input.incorrect,
    skipped: input.skipped,
    score: Math.round(percentage * 10) / 10,
    percentage: Math.round(percentage * 10) / 10,
    grade: gradeFromPercentage(percentage),
  };
}
