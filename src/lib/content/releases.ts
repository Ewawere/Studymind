/**
 * Versioned content releases.
 * Track what content ships together, QA state, and rollbacks.
 * Persisted as LearningEvents + optional QuestionImport linkage for MVP.
 */

import { prisma } from "@/lib/prisma";
import type {
  ContentReleasePlan,
  ContentReleaseStatus,
  ContentReleaseSummary,
} from "./types";

const TYPE = "content_release";

export async function createRelease(
  plan: ContentReleasePlan,
  actorUserId: string
): Promise<ContentReleaseSummary> {
  const existing = await findReleaseByVersion(plan.version);
  if (existing) {
    throw new Error(`Release ${plan.version} already exists`);
  }

  const event = await prisma.learningEvent.create({
    data: {
      userId: actorUserId,
      type: TYPE,
      payload: {
        version: plan.version,
        codename: plan.codename,
        status: "draft" satisfies ContentReleaseStatus,
        curriculumCodes: plan.curriculumCodes,
        subjectCodes: plan.subjectCodes,
        notes: plan.notes,
        questionIds: [] as string[],
        unitIds: [] as string[],
        importIds: [] as string[],
      },
    },
  });

  return toSummary(event.id, event.createdAt, event.payload as Record<string, unknown>);
}

export async function findReleaseByVersion(
  version: string
): Promise<ContentReleaseSummary | null> {
  const rows = await prisma.learningEvent.findMany({
    where: { type: TYPE },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  for (const r of rows) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    if (p.version === version) {
      return toSummary(r.id, r.createdAt, p);
    }
  }
  return null;
}

export async function listReleases(): Promise<ContentReleaseSummary[]> {
  const rows = await prisma.learningEvent.findMany({
    where: { type: TYPE },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) =>
    toSummary(r.id, r.createdAt, (r.payload ?? {}) as Record<string, unknown>)
  );
}

export async function setReleaseStatus(
  version: string,
  status: ContentReleaseStatus,
  actorUserId: string
) {
  const release = await findReleaseByVersion(version);
  if (!release) throw new Error(`Release ${version} not found`);

  const event = await prisma.learningEvent.findUniqueOrThrow({
    where: { id: release.id },
  });
  const payload = {
    ...((event.payload as object) ?? {}),
    status,
    ...(status === "published"
      ? { publishedAt: new Date().toISOString() }
      : {}),
    updatedBy: actorUserId,
    updatedAt: new Date().toISOString(),
  };

  await prisma.learningEvent.update({
    where: { id: release.id },
    data: { payload },
  });

  return findReleaseByVersion(version);
}

/** Attach a completed QuestionImport to a release for auditability */
export async function attachImportToRelease(
  version: string,
  importId: string
) {
  const release = await findReleaseByVersion(version);
  if (!release) throw new Error(`Release ${version} not found`);

  const event = await prisma.learningEvent.findUniqueOrThrow({
    where: { id: release.id },
  });
  const p = (event.payload ?? {}) as {
    importIds?: string[];
    questionIds?: string[];
  };
  const importIds = [...new Set([...(p.importIds ?? []), importId])];

  const imported = await prisma.question.findMany({
    where: { importId },
    select: { id: true },
  });
  const questionIds = [
    ...new Set([...(p.questionIds ?? []), ...imported.map((q) => q.id)]),
  ];

  await prisma.learningEvent.update({
    where: { id: release.id },
    data: {
      payload: {
        ...(event.payload as object),
        importIds,
        questionIds,
      },
    },
  });

  return findReleaseByVersion(version);
}

function toSummary(
  id: string,
  createdAt: Date,
  p: Record<string, unknown>
): ContentReleaseSummary {
  const questionIds = (p.questionIds as string[]) ?? [];
  const unitIds = (p.unitIds as string[]) ?? [];
  return {
    id,
    version: String(p.version ?? ""),
    status: (p.status as ContentReleaseStatus) ?? "draft",
    curriculumCodes: (p.curriculumCodes as string[]) ?? [],
    subjectCodes: (p.subjectCodes as string[]) ?? [],
    questionCount: questionIds.length,
    noteCount: unitIds.filter((u) => u.startsWith("note:")).length,
    exampleCount: unitIds.filter((u) => u.startsWith("example:")).length,
    publishedAt: p.publishedAt ? String(p.publishedAt) : undefined,
    createdAt: createdAt.toISOString(),
  };
}
