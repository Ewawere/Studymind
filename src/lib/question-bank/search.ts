/**
 * Search & filter questions.
 * Uses Prisma filters + simple stem contains for keyword search.
 * Swap to Postgres full-text (tsvector) later without API changes.
 */

import { prisma } from "@/lib/prisma";
import type {
  SearchFilters,
  SearchResult,
  QuestionSummary,
  QuestionAIContext,
} from "./types";

export async function searchQuestions(
  filters: SearchFilters = {}
): Promise<SearchResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  // Resolve codes → ids if needed
  let curriculumId = filters.curriculumId;
  if (!curriculumId && filters.curriculumCode) {
    const c = await prisma.curriculum.findUnique({
      where: { code: filters.curriculumCode },
    });
    curriculumId = c?.id;
  }

  let subjectId = filters.subjectId;
  if (!subjectId && filters.subjectCode && curriculumId) {
    const s = await prisma.subject.findFirst({
      where: { code: filters.subjectCode, curriculumId },
    });
    subjectId = s?.id;
  }

  const where: Record<string, unknown> = {
    status: filters.status ?? "ACTIVE",
    isActive: true,
  };

  if (curriculumId) where.curriculumId = curriculumId;
  if (subjectId) where.subjectId = subjectId;
  if (filters.topicId) where.topicId = filters.topicId;
  if (filters.conceptId) where.conceptId = filters.conceptId;
  if (filters.year) where.year = filters.year;
  if (filters.yearMin || filters.yearMax) {
    where.year = {
      ...(filters.yearMin ? { gte: filters.yearMin } : {}),
      ...(filters.yearMax ? { lte: filters.yearMax } : {}),
    };
  }
  if (filters.difficultyMin || filters.difficultyMax) {
    where.authorDifficulty = {
      ...(filters.difficultyMin ? { gte: filters.difficultyMin } : {}),
      ...(filters.difficultyMax ? { lte: filters.difficultyMax } : {}),
    };
  }
  if (filters.estimatedTimeMaxSec) {
    where.estimatedTimeSec = { lte: filters.estimatedTimeMaxSec };
  }
  if (filters.source) where.source = { contains: filters.source, mode: "insensitive" };
  if (filters.language) where.language = filters.language;
  if (filters.type) where.type = filters.type;
  if (filters.query) {
    where.OR = [
      { stem: { contains: filters.query, mode: "insensitive" } },
      { explanation: { contains: filters.query, mode: "insensitive" } },
      { keywords: { has: filters.query.toLowerCase() } },
    ];
  }
  if (filters.tags?.length) {
    where.tags = { some: { tag: { slug: { in: filters.tags.map((t) => t.toLowerCase()) } } } };
  }

  const [total, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: {
        tags: { include: { tag: true } },
      },
    }),
  ]);

  const items: QuestionSummary[] = rows.map((q) => ({
    id: q.id,
    stem: q.stem,
    type: q.type,
    authorDifficulty: q.authorDifficulty,
    calculatedDifficulty: q.calculatedDifficulty,
    year: q.year,
    source: q.source,
    subjectId: q.subjectId,
    topicId: q.topicId,
    conceptId: q.conceptId,
    tags: q.tags.map((t) => t.tag.name),
    estimatedTimeSec: q.estimatedTimeSec,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getQuestionById(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { order: "asc" } },
      media: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      concepts: { include: { concept: true } },
      statistics: true,
      curriculum: true,
      subject: true,
      topic: true,
      concept: true,
    },
  });
}

export async function getQuestionsByTopic(
  topicId: string,
  page = 1,
  pageSize = 20
) {
  return searchQuestions({ topicId, page, pageSize });
}

export async function getQuestionsByConcept(
  conceptId: string,
  page = 1,
  pageSize = 20
) {
  return searchQuestions({ conceptId, page, pageSize });
}

/** Structured payload for the AI Tutor */
export async function getQuestionAIContext(
  questionId: string
): Promise<QuestionAIContext | null> {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      concepts: { include: { concept: true } },
      concept: {
        include: {
          prerequisitesTo: {
            where: { relationType: "prerequisite" },
            include: { fromConcept: true },
          },
          prerequisitesFrom: {
            where: { relationType: "related" },
            include: { toConcept: true },
          },
        },
      },
    },
  });

  if (!q) return null;

  const prerequisites =
    q.concept?.prerequisitesTo.map((e) => ({
      id: e.fromConcept.id,
      name: e.fromConcept.name,
    })) ?? [];

  const relatedConcepts =
    q.concept?.prerequisitesFrom.map((e) => ({
      id: e.toConcept.id,
      name: e.toConcept.name,
    })) ?? [];

  return {
    id: q.id,
    stem: q.stem,
    type: q.type,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    correctKey: q.correctKey,
    explanation: q.explanation,
    learningObjectives: q.learningObjectives,
    commonMistakes: (q.commonMistakes as { mistake: string; why?: string }[]) ?? [],
    difficulty: q.authorDifficulty,
    calculatedDifficulty: q.calculatedDifficulty,
    tags: q.tags.map((t) => t.tag.name),
    keywords: q.keywords,
    concepts: q.concepts.map((c) => ({
      id: c.conceptId,
      name: c.concept.name,
      role: c.role,
    })),
    prerequisites,
    relatedConcepts,
    estimatedTimeSec: q.estimatedTimeSec,
    source: q.source,
    year: q.year,
    bloomLevel: q.bloomLevel,
  };
}
