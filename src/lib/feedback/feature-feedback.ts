/**
 * Feature feedback & lightweight feature requests.
 */

import { prisma } from "@/lib/prisma";
import type { FeatureFeedbackInput } from "./types";
import type { Prisma } from "@prisma/client";

export async function submitFeatureFeedback(input: FeatureFeedbackInput) {
  if (!input.userId) throw new Error("userId is required");
  if (!input.feature?.trim()) throw new Error("feature is required");

  const rating =
    input.rating != null
      ? Math.min(5, Math.max(1, Math.round(input.rating)))
      : undefined;

  const event = await prisma.learningEvent.create({
    data: {
      userId: input.userId,
      type: "feature_feedback",
      payload: {
        feature: input.feature.trim().slice(0, 100),
        rating,
        comment: input.comment?.trim().slice(0, 2000),
        wouldRecommend: input.wouldRecommend,
        meta: input.meta,
      } as Prisma.InputJsonValue,
    },
  });

  return { id: event.id };
}

export async function getFeatureRatings(feature: string) {
  const rows = await prisma.learningEvent.findMany({
    where: { type: "feature_feedback" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const matched = rows
    .map((r) => (r.payload as { feature?: string; rating?: number }) ?? {})
    .filter((p) => p.feature === feature && typeof p.rating === "number");

  if (!matched.length) {
    return { feature, count: 0, average: null as number | null };
  }

  const sum = matched.reduce((s, p) => s + (p.rating ?? 0), 0);
  return {
    feature,
    count: matched.length,
    average: Math.round((sum / matched.length) * 100) / 100,
  };
}
