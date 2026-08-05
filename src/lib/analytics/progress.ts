/**
 * Progress timeline.
 */

import { prisma } from "@/lib/prisma";
import { dailyBuckets, type AttemptRow } from "./aggregation";
import type { ProgressPoint } from "./types";

export async function getProgressTimeline(
  userId: string,
  days = 30
): Promise<ProgressPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const attempts = await prisma.questionAttempt.findMany({
    where: { userId, createdAt: { gte: since }, skipped: false },
    select: {
      isCorrect: true,
      timeSpentMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: AttemptRow[] = attempts.map((a) => ({
    isCorrect: a.isCorrect,
    timeSpentMs: a.timeSpentMs,
    createdAt: a.createdAt,
  }));

  const buckets = dailyBuckets(rows, days);

  // Approximate daily mastery from cumulative accuracy (lightweight)
  let cumulativeQ = 0;
  let cumulativeC = 0;
  return buckets.map((b) => {
    cumulativeQ += b.questions;
    cumulativeC += b.correct;
    const mastery =
      cumulativeQ > 0 ? Math.round((cumulativeC / cumulativeQ) * 1000) / 10 : 0;
    return {
      date: b.date,
      mastery,
      confidence: mastery, // proxy until daily confidence snapshots exist
      questions: b.questions,
      correct: b.correct,
    };
  });
}
