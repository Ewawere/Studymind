/**
 * Mastery views for heatmaps and subject/concept drills.
 */

import { prisma } from "@/lib/prisma";
import type { MasteryHeatmapCell } from "./types";

export async function getMasteryHeatmap(
  userId: string
): Promise<MasteryHeatmapCell[]> {
  const states = await prisma.conceptState.findMany({
    where: { userId },
    include: {
      concept: {
        include: {
          topic: { include: { subject: true } },
        },
      },
    },
  });

  return states.map((s) => ({
    subjectId: s.concept.topic.subjectId,
    subjectName: s.concept.topic.subject.name,
    topicId: s.concept.topicId,
    topicName: s.concept.topic.name,
    mastery: Math.round(s.masteryScore * 10) / 10,
    confidence: Math.round(s.confidence * 10) / 10,
    attempted: s.repetitions,
  }));
}

export async function getSubjectAnalytics(userId: string, subjectId?: string) {
  const masteries = await prisma.subjectMastery.findMany({
    where: {
      userId,
      ...(subjectId ? { subjectId } : {}),
    },
    include: { subject: true },
  });

  return masteries.map((m) => ({
    subjectId: m.subjectId,
    name: m.subject.name,
    mastery: m.masteryScore,
    confidence: m.confidence,
    attempted: m.questionsAttempted,
    correct: m.questionsCorrect,
    accuracy:
      m.questionsAttempted > 0
        ? Math.round((m.questionsCorrect / m.questionsAttempted) * 1000) / 10
        : 0,
    lastPracticedAt: m.lastPracticedAt,
  }));
}

export async function getConceptAnalytics(
  userId: string,
  opts?: { subjectId?: string; topicId?: string }
) {
  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      ...(opts?.subjectId
        ? { concept: { topic: { subjectId: opts.subjectId } } }
        : {}),
      ...(opts?.topicId ? { concept: { topicId: opts.topicId } } : {}),
    },
    include: {
      concept: { include: { topic: true } },
    },
    orderBy: { masteryScore: "asc" },
  });

  return states.map((s) => ({
    conceptId: s.conceptId,
    name: s.concept.name,
    topicId: s.concept.topicId,
    topicName: s.concept.topic.name,
    mastery: s.masteryScore,
    confidence: s.confidence,
    easeFactor: s.easeFactor,
    intervalDays: s.intervalDays,
    nextReviewAt: s.nextReviewAt,
    repetitions: s.repetitions,
  }));
}
