/**
 * Moderation queues — duplicates, low quality, flagged.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listFlaggedQuestions(actor: AdminActor, limit = 50) {
  assertPermission(actor, "moderation.review");
  return prisma.question.findMany({
    where: {
      OR: [
        { status: "DUPLICATE_FLAGGED" },
        { status: "DRAFT" },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      subject: { select: { name: true } },
      statistics: true,
    },
  });
}

export async function listLowQualityQuestions(actor: AdminActor, limit = 50) {
  assertPermission(actor, "moderation.review");
  // Heuristic: many attempts + low correct rate
  const stats = await prisma.questionStatistics.findMany({
    where: {
      totalAttempts: { gte: 20 },
    },
    orderBy: { totalAttempts: "desc" },
    take: 200,
    include: {
      question: {
        select: {
          id: true,
          stem: true,
          status: true,
          subject: { select: { name: true } },
        },
      },
    },
  });

  return stats
    .map((s) => ({
      ...s,
      correctRate: s.totalAttempts
        ? s.correctCount / s.totalAttempts
        : 0,
    }))
    .filter((s) => s.correctRate < 0.2 || s.correctRate > 0.98)
    .slice(0, limit);
}

export async function resolveFlag(
  actor: AdminActor,
  questionId: string,
  resolution: "activate" | "archive" | "keep_flagged"
) {
  assertPermission(actor, "moderation.review");

  if (resolution === "activate") {
    await prisma.question.update({
      where: { id: questionId },
      data: { status: "ACTIVE", isActive: true },
    });
  } else if (resolution === "archive") {
    await prisma.question.update({
      where: { id: questionId },
      data: { status: "ARCHIVED", isActive: false },
    });
  }

  await writeAudit(actor, "moderation.resolve", "Question", questionId, {
    resolution,
  });
}
