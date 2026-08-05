/**
 * Intelligent question selection
 *
 * Weights:
 *  40% weak concepts
 *  25% spaced repetition due today
 *  15% curriculum / subject priority
 *  10% recent mistakes
 *   5% author difficulty alignment
 *   5% randomness
 */

import { prisma } from "@/lib/prisma";
import { isDue } from "@/lib/learning-brain";
import type { CreateSessionOptions, ScoredQuestion, SessionMode } from "./types";

export async function selectQuestionQueue(
  options: CreateSessionOptions
): Promise<string[]> {
  const count = Math.min(50, Math.max(1, options.questionCount ?? 10));
  const mode = options.mode ?? "practice";

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    isActive: true,
  };
  if (options.subjectIds?.length) where.subjectId = { in: options.subjectIds };
  if (options.topicIds?.length) where.topicId = { in: options.topicIds };
  if (options.conceptIds?.length) where.conceptId = { in: options.conceptIds };

  // Mode-specific filters
  if (mode === "challenge" && options.targetDifficulty) {
    where.authorDifficulty = {
      gte: Math.max(1, options.targetDifficulty - 1),
      lte: Math.min(5, options.targetDifficulty + 1),
    };
  }

  const candidates = await prisma.question.findMany({
    where,
    select: {
      id: true,
      conceptId: true,
      subjectId: true,
      authorDifficulty: true,
      calculatedDifficulty: true,
    },
    take: 500,
  });

  if (candidates.length === 0) return [];

  // Learning signals
  const [conceptStates, recentWrong] = await Promise.all([
    prisma.conceptState.findMany({ where: { userId: options.userId } }),
    prisma.questionAttempt.findMany({
      where: {
        userId: options.userId,
        isCorrect: false,
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      select: { questionId: true, question: { select: { conceptId: true } } },
      take: 100,
    }),
  ]);

  const stateByConcept = new Map(conceptStates.map((s) => [s.conceptId, s]));
  const recentMistakeConcepts = new Set(
    recentWrong.map((a) => a.question.conceptId).filter(Boolean) as string[]
  );
  const recentMistakeQuestions = new Set(recentWrong.map((a) => a.questionId));

  const primaryFocusSubjects = new Set(options.subjectIds ?? []);

  const scored: ScoredQuestion[] = candidates.map((q) => {
    const reasons: string[] = [];
    let score = 0;
    const state = q.conceptId ? stateByConcept.get(q.conceptId) : undefined;

    // 40% weak concepts
    if (state) {
      const weak = Math.max(0, (60 - state.masteryScore) / 60);
      score += weak * 40;
      if (state.masteryScore < 50) reasons.push("weak concept");
    } else {
      score += 20; // unexplored
      reasons.push("unexplored");
    }

    // 25% SM-2 due
    if (state && isDue({
      easeFactor: state.easeFactor,
      intervalDays: state.intervalDays,
      repetitions: state.repetitions,
      nextReviewAt: state.nextReviewAt,
      lastReviewedAt: state.lastReviewedAt,
    })) {
      score += 25;
      reasons.push("due for review");
    }

    // 15% curriculum priority (subject focus)
    if (primaryFocusSubjects.size === 0 || primaryFocusSubjects.has(q.subjectId)) {
      score += 15;
    }

    // 10% recent mistakes
    if (recentMistakeQuestions.has(q.id)) {
      score += 10;
      reasons.push("recent mistake");
    } else if (q.conceptId && recentMistakeConcepts.has(q.conceptId)) {
      score += 6;
      reasons.push("concept recently missed");
    }

    // 5% difficulty alignment
    const diff = q.calculatedDifficulty ?? q.authorDifficulty;
    if (mode === "challenge") {
      score += (diff / 5) * 5;
    } else if (mode === "weakness") {
      score += ((6 - diff) / 5) * 5; // prefer slightly easier for weak mode rebuild
    } else {
      score += 2.5; // neutral
    }

    // 5% randomness
    score += Math.random() * 5;

    // Mode hard filters via score boost
    if (mode === "revision") {
      if (state && state.repetitions > 0 && isDue({
        easeFactor: state.easeFactor,
        intervalDays: state.intervalDays,
        repetitions: state.repetitions,
        nextReviewAt: state.nextReviewAt,
        lastReviewedAt: state.lastReviewedAt,
      })) {
        score += 50;
      } else {
        score *= 0.2;
      }
    }
    if (mode === "weakness") {
      if (state && state.masteryScore < 55) score += 40;
      else score *= 0.3;
    }

    return {
      questionId: q.id,
      conceptId: q.conceptId,
      subjectId: q.subjectId,
      authorDifficulty: q.authorDifficulty,
      score,
      reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversify: avoid too many from same concept in a row
  const selected: string[] = [];
  const conceptCounts = new Map<string, number>();

  for (const item of scored) {
    if (selected.length >= count) break;
    const cid = item.conceptId ?? "_";
    const n = conceptCounts.get(cid) ?? 0;
    if (n >= 3 && selected.length < count - 1) continue;
    selected.push(item.questionId);
    conceptCounts.set(cid, n + 1);
  }

  // Fallback fill
  if (selected.length < count) {
    for (const item of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(item.questionId)) selected.push(item.questionId);
    }
  }

  return selected;
}
