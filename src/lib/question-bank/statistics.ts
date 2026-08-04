/**
 * Question statistics + difficulty recalibration.
 * Author difficulty is never overwritten.
 */

import { prisma } from "@/lib/prisma";

/**
 * Call after every question attempt to keep stats live.
 */
export async function updateQuestionStatistics(
  questionId: string,
  result: {
    isCorrect: boolean;
    timeSpentMs?: number | null;
    skipped?: boolean;
  }
): Promise<void> {
  const stats = await prisma.questionStatistics.upsert({
    where: { questionId },
    create: {
      questionId,
      totalAttempts: result.skipped ? 0 : 1,
      correctCount: result.isCorrect ? 1 : 0,
      incorrectCount: !result.isCorrect && !result.skipped ? 1 : 0,
      skipCount: result.skipped ? 1 : 0,
      averageTimeMs: result.timeSpentMs ?? null,
    },
    update: {},
  });

  // Recompute from update payload
  const totalAttempts = stats.totalAttempts + (result.skipped ? 0 : 1);
  const correctCount = stats.correctCount + (result.isCorrect ? 1 : 0);
  const incorrectCount =
    stats.incorrectCount + (!result.isCorrect && !result.skipped ? 1 : 0);
  const skipCount = stats.skipCount + (result.skipped ? 1 : 0);

  let averageTimeMs = stats.averageTimeMs;
  if (result.timeSpentMs != null && !result.skipped) {
    const prevTotal = stats.averageTimeMs
      ? stats.averageTimeMs * stats.totalAttempts
      : 0;
    averageTimeMs = (prevTotal + result.timeSpentMs) / totalAttempts;
  }

  // Simple popularity: attempts + bookmarks weight
  const popularityScore =
    totalAttempts + stats.bookmarkCount * 3 + stats.aiExplanationRequests * 0.5;

  await prisma.questionStatistics.update({
    where: { questionId },
    data: {
      totalAttempts,
      correctCount,
      incorrectCount,
      skipCount,
      averageTimeMs,
      popularityScore,
    },
  });
}

/**
 * Recalculate calculatedDifficulty from performance.
 * Does NOT touch authorDifficulty.
 *
 * Mapping (rough):
 *  success rate high + fast → lower difficulty
 *  success rate low + slow → higher difficulty
 * Scale 1.0 – 5.0
 */
export async function recalibrateDifficulty(
  questionId: string
): Promise<number | null> {
  const stats = await prisma.questionStatistics.findUnique({
    where: { questionId },
  });
  if (!stats || stats.totalAttempts < 20) {
    return null; // not enough signal
  }

  const successRate = stats.correctCount / stats.totalAttempts; // 0–1
  // Invert: high success → easier
  let difficulty = 1 + (1 - successRate) * 4; // 1–5

  // Time pressure adjustment
  if (stats.averageTimeMs != null) {
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      select: { estimatedTimeSec: true },
    });
    if (q?.estimatedTimeSec) {
      const ratio = stats.averageTimeMs / (q.estimatedTimeSec * 1000);
      if (ratio > 1.5) difficulty += 0.3;
      if (ratio < 0.6) difficulty -= 0.3;
    }
  }

  // Skip rate as confusion signal
  const skipRate = stats.skipCount / Math.max(1, stats.totalAttempts + stats.skipCount);
  if (skipRate > 0.2) difficulty += 0.4;

  difficulty = Math.max(1, Math.min(5, Math.round(difficulty * 10) / 10));

  await prisma.question.update({
    where: { id: questionId },
    data: { calculatedDifficulty: difficulty },
  });

  return difficulty;
}

/**
 * Batch recalibrate all questions with enough attempts.
 */
export async function recalibrateAllDifficulties(
  minAttempts = 20
): Promise<number> {
  const stats = await prisma.questionStatistics.findMany({
    where: { totalAttempts: { gte: minAttempts } },
    select: { questionId: true },
  });

  let updated = 0;
  for (const s of stats) {
    const d = await recalibrateDifficulty(s.questionId);
    if (d != null) updated++;
  }
  return updated;
}
