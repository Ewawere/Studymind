/**
 * Configurable post-exam review.
 */

import { prisma } from "@/lib/prisma";
import type { ReviewMode } from "./types";

export interface ReviewItem {
  questionId: string;
  index: number;
  stem: string;
  selectedKey: string | null;
  correctKey: string | null;
  isCorrect: boolean;
  explanation: string | null;
  options: { key: string; text: string }[];
}

export async function getExamReview(
  examId: string
): Promise<{ mode: ReviewMode; items: ReviewItem[] }> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });

  if (row.status !== "submitted" && row.status !== "expired") {
    throw new Error("Review available only after submission");
  }

  const cfg = (row.config ?? {}) as {
    rules?: { reviewMode?: ReviewMode };
    answers?: Record<
      string,
      { selectedKey?: string | null }
    >;
  };
  const reviewMode: ReviewMode = cfg.rules?.reviewMode ?? "full_explanations";

  if (reviewMode === "disabled") {
    return { mode: reviewMode, items: [] };
  }

  const attempts = await prisma.questionAttempt.findMany({
    where: { quizAttemptId: examId },
    include: {
      question: {
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  const byId = new Map(attempts.map((a) => [a.questionId, a]));
  const items: ReviewItem[] = [];

  row.questionQueue.forEach((qid, index) => {
    const a = byId.get(qid);
    const q = a?.question;
    if (!q) return;

    const isCorrect = a?.isCorrect ?? false;
    if (reviewMode === "mistakes_only" && isCorrect) return;

    items.push({
      questionId: qid,
      index,
      stem: q.stem,
      selectedKey: a?.selectedKey ?? null,
      correctKey:
        reviewMode === "disabled" ? null : q.correctKey,
      isCorrect,
      explanation:
        reviewMode === "full_explanations" || reviewMode === "mistakes_only"
          ? q.explanation
          : null,
      options: q.options.map((o) => ({ key: o.key, text: o.text })),
    });
  });

  return { mode: reviewMode, items };
}
