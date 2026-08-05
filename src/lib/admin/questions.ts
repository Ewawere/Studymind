/**
 * Question management for admins.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor, QuestionAdminFilters } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listQuestions(
  actor: AdminActor,
  filters: QuestionAdminFilters = {}
) {
  assertPermission(actor, "questions.read");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 20);
  const where: Record<string, unknown> = {};
  if (filters.curriculumId) where.curriculumId = filters.curriculumId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.topicId) where.topicId = filters.topicId;
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.stem = { contains: filters.q, mode: "insensitive" };
  }

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        subject: { select: { name: true, code: true } },
        topic: { select: { name: true } },
        options: { orderBy: { order: "asc" } },
        statistics: true,
      },
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getQuestionAdmin(actor: AdminActor, id: string) {
  assertPermission(actor, "questions.read");
  return prisma.question.findUniqueOrThrow({
    where: { id },
    include: {
      options: { orderBy: { order: "asc" } },
      media: true,
      tags: { include: { tag: true } },
      concepts: { include: { concept: true } },
      revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
      statistics: true,
      subject: true,
      topic: true,
      curriculum: true,
    },
  });
}

export async function createQuestion(
  actor: AdminActor,
  data: {
    curriculumId: string;
    subjectId: string;
    topicId?: string;
    conceptId?: string;
    stem: string;
    correctKey?: string;
    authorDifficulty?: number;
    explanation?: string;
    options?: { key: string; text: string; isCorrect?: boolean }[];
    learningObjectives?: string[];
    source?: string;
    year?: number;
  }
) {
  assertPermission(actor, "questions.write");

  const question = await prisma.question.create({
    data: {
      curriculumId: data.curriculumId,
      subjectId: data.subjectId,
      topicId: data.topicId,
      conceptId: data.conceptId,
      stem: data.stem,
      correctKey: data.correctKey,
      authorDifficulty: data.authorDifficulty ?? 3,
      explanation: data.explanation,
      learningObjectives: data.learningObjectives ?? [],
      source: data.source,
      year: data.year,
      status: "DRAFT",
      options: data.options
        ? {
            create: data.options.map((o, i) => ({
              key: o.key,
              text: o.text,
              order: i,
              isCorrect: o.isCorrect ?? o.key === data.correctKey,
            })),
          }
        : undefined,
      revisions: {
        create: {
          revisionNumber: 1,
          snapshot: data as object,
          changedBy: actor.userId,
          changeNote: "Created",
        },
      },
    },
  });

  await writeAudit(actor, "question.create", "Question", question.id);
  return question;
}

export async function updateQuestion(
  actor: AdminActor,
  id: string,
  patch: Record<string, unknown>,
  changeNote?: string
) {
  assertPermission(actor, "questions.write");
  const existing = await prisma.question.findUniqueOrThrow({ where: { id } });

  const nextRev = existing.revisionNumber + 1;
  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...sanitizeQuestionPatch(patch),
      revisionNumber: nextRev,
      revisions: {
        create: {
          revisionNumber: nextRev,
          snapshot: patch,
          changedBy: actor.userId,
          changeNote: changeNote ?? "Updated",
        },
      },
    },
  });

  await writeAudit(actor, "question.update", "Question", id, { changeNote });
  return updated;
}

function sanitizeQuestionPatch(patch: Record<string, unknown>) {
  const allowed = [
    "stem",
    "correctKey",
    "explanation",
    "authorDifficulty",
    "commonMistakes",
    "learningObjectives",
    "estimatedTimeSec",
    "source",
    "year",
    "bloomLevel",
    "keywords",
    "topicId",
    "conceptId",
    "language",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in patch) out[k] = patch[k];
  }
  return out;
}

export async function publishQuestion(actor: AdminActor, id: string) {
  assertPermission(actor, "questions.publish");
  const q = await prisma.question.update({
    where: { id },
    data: { status: "ACTIVE", isActive: true },
  });
  await writeAudit(actor, "question.publish", "Question", id);
  return q;
}

export async function archiveQuestion(actor: AdminActor, id: string) {
  assertPermission(actor, "questions.write");
  const q = await prisma.question.update({
    where: { id },
    data: { status: "ARCHIVED", isActive: false },
  });
  await writeAudit(actor, "question.archive", "Question", id);
  return q;
}

export async function restoreQuestion(actor: AdminActor, id: string) {
  assertPermission(actor, "questions.write");
  const q = await prisma.question.update({
    where: { id },
    data: { status: "ACTIVE", isActive: true },
  });
  await writeAudit(actor, "question.restore", "Question", id);
  return q;
}

export async function softDeleteQuestion(actor: AdminActor, id: string) {
  assertPermission(actor, "questions.delete");
  const q = await prisma.question.update({
    where: { id },
    data: { status: "ARCHIVED", isActive: false },
  });
  await writeAudit(actor, "question.soft_delete", "Question", id);
  return q;
}

export async function bulkSetStatus(
  actor: AdminActor,
  ids: string[],
  status: "ACTIVE" | "ARCHIVED" | "DRAFT"
) {
  assertPermission(actor, "questions.write");
  const result = await prisma.question.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      isActive: status === "ACTIVE",
    },
  });
  await writeAudit(actor, "question.bulk_status", "Question", undefined, {
    ids,
    status,
    count: result.count,
  });
  return result;
}
