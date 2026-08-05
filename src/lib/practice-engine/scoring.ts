/**
 * Mark answers and build feedback payloads.
 */

import { prisma } from "@/lib/prisma";
import type { AnswerFeedback } from "./types";

export async function markAnswer(
  questionId: string,
  selectedKey: string | null
): Promise<{
  isCorrect: boolean;
  correctKey: string | null;
  explanation: string | null;
  commonMistakes: { mistake: string; why?: string }[];
  learningObjectives: string[];
  conceptId: string | null;
  subjectId: string;
  difficulty: number;
  estimatedTimeSec: number | null;
}> {
  const q = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: {
      correctKey: true,
      explanation: true,
      commonMistakes: true,
      learningObjectives: true,
      conceptId: true,
      subjectId: true,
      authorDifficulty: true,
      calculatedDifficulty: true,
      estimatedTimeSec: true,
    },
  });

  const correctKey = q.correctKey;
  const isCorrect =
    selectedKey != null &&
    correctKey != null &&
    selectedKey.trim().toUpperCase() === correctKey.trim().toUpperCase();

  return {
    isCorrect,
    correctKey,
    explanation: q.explanation,
    commonMistakes:
      (q.commonMistakes as { mistake: string; why?: string }[]) ?? [],
    learningObjectives: q.learningObjectives,
    conceptId: q.conceptId,
    subjectId: q.subjectId,
    difficulty: Math.round(q.calculatedDifficulty ?? q.authorDifficulty),
    estimatedTimeSec: q.estimatedTimeSec,
  };
}

export function buildFeedback(
  marked: Awaited<ReturnType<typeof markAnswer>>,
  extras: {
    xpGained: number;
    masteryDelta?: number;
    confidence?: number;
  }
): AnswerFeedback {
  return {
    isCorrect: marked.isCorrect,
    correctKey: marked.correctKey,
    explanation: marked.explanation,
    commonMistakes: marked.commonMistakes,
    learningObjectives: marked.learningObjectives,
    xpGained: extras.xpGained,
    masteryDelta: extras.masteryDelta,
    confidence: extras.confidence,
    conceptId: marked.conceptId,
  };
}
