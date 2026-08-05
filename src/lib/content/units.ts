/**
 * Content units: learning notes, worked examples, misconception guides.
 * Stored as LearningEvents until a dedicated ContentUnit table is migrated.
 */

import { prisma } from "@/lib/prisma";
import type { ContentUnitInput, ContentUnitType } from "./types";

const TYPE = "content_unit";

export async function createContentUnit(
  input: ContentUnitInput,
  actorUserId: string
) {
  if (!input.title?.trim() || !input.body?.trim()) {
    throw new Error("title and body are required");
  }

  const event = await prisma.learningEvent.create({
    data: {
      userId: actorUserId,
      type: TYPE,
      payload: {
        unitType: input.type,
        curriculumCode: input.curriculumCode,
        subjectCode: input.subjectCode,
        topicName: input.topicName,
        conceptName: input.conceptName,
        title: input.title.trim(),
        body: input.body.trim(),
        difficulty: input.difficulty,
        bloomLevel: input.bloomLevel,
        tags: input.tags ?? [],
        relatedQuestionIds: input.relatedQuestionIds ?? [],
        releaseVersion: input.releaseVersion,
        status: "draft",
      },
    },
  });

  return { id: event.id, type: input.type };
}

export async function listContentUnits(opts: {
  type?: ContentUnitType;
  curriculumCode?: string;
  subjectCode?: string;
  conceptName?: string;
  releaseVersion?: string;
  limit?: number;
}) {
  const rows = await prisma.learningEvent.findMany({
    where: { type: TYPE },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });

  return rows
    .map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        type: p.unitType as ContentUnitType,
        curriculumCode: String(p.curriculumCode ?? ""),
        subjectCode: String(p.subjectCode ?? ""),
        topicName: p.topicName ? String(p.topicName) : undefined,
        conceptName: p.conceptName ? String(p.conceptName) : undefined,
        title: String(p.title ?? ""),
        body: String(p.body ?? ""),
        difficulty: typeof p.difficulty === "number" ? p.difficulty : undefined,
        bloomLevel: p.bloomLevel ? String(p.bloomLevel) : undefined,
        tags: (p.tags as string[]) ?? [],
        relatedQuestionIds: (p.relatedQuestionIds as string[]) ?? [],
        releaseVersion: p.releaseVersion ? String(p.releaseVersion) : undefined,
        status: String(p.status ?? "draft"),
        createdAt: r.createdAt.toISOString(),
      };
    })
    .filter((u) => {
      if (opts.type && u.type !== opts.type) return false;
      if (opts.curriculumCode && u.curriculumCode !== opts.curriculumCode)
        return false;
      if (opts.subjectCode && u.subjectCode !== opts.subjectCode) return false;
      if (opts.conceptName && u.conceptName !== opts.conceptName) return false;
      if (opts.releaseVersion && u.releaseVersion !== opts.releaseVersion)
        return false;
      return true;
    });
}

/** Ideal question metadata checklist for content authors */
export const QUESTION_QUALITY_CHECKLIST = [
  "step_by_step_explanation",
  "common_misconception",
  "difficulty",
  "bloom_level",
  "concepts_tested",
  "prerequisites",
  "related_questions",
  "ai_tutor_context",
] as const;
