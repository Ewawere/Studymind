/**
 * Internal review workflow for content releases.
 */

import { prisma } from "@/lib/prisma";
import { setReleaseStatus, findReleaseByVersion } from "./releases";

export type ReviewDecision = "approve" | "request_changes" | "reject";

export async function submitReview(
  version: string,
  actorUserId: string,
  decision: ReviewDecision,
  notes?: string
) {
  const release = await findReleaseByVersion(version);
  if (!release) throw new Error(`Release ${version} not found`);

  await prisma.learningEvent.create({
    data: {
      userId: actorUserId,
      type: "content_review",
      payload: {
        version,
        decision,
        notes,
        releaseId: release.id,
      },
    },
  });

  if (decision === "approve") {
    // move qa → published only if currently in qa
    if (release.status === "qa") {
      return setReleaseStatus(version, "published", actorUserId);
    }
  }

  if (decision === "request_changes" || decision === "reject") {
    return setReleaseStatus(version, "draft", actorUserId);
  }

  return release;
}

export async function listReviews(version: string) {
  const rows = await prisma.learningEvent.findMany({
    where: { type: "content_review" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows
    .map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        version: String(p.version ?? ""),
        decision: String(p.decision ?? ""),
        notes: p.notes ? String(p.notes) : undefined,
        reviewerId: r.userId,
        createdAt: r.createdAt.toISOString(),
      };
    })
    .filter((r) => r.version === version);
}
