/**
 * getAITutorContext(userId)
 *
 * One call returns everything the AI Tutor needs.
 * No extra DB round-trips from the tutor layer.
 */

import { prisma } from "@/lib/prisma";
import { applyDecay } from "./mastery";
import { estimateRetention } from "./forgetting";
import {
  detectWeakTopics,
  type ConceptSnapshot,
} from "./recommendations";
import { generateDailyPlan as buildDailyPlan } from "./planner";
import { calculateExamReadiness } from "./analytics";
import { assembleInsights } from "./insights";
import type {
  AITutorContext,
  ConceptEdge,
  UserLearningContext,
  DailyPlan,
} from "./types";
import { initialSM2State } from "./sm2";

export async function getAITutorContext(
  userId: string
): Promise<AITutorContext> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const ctx: UserLearningContext = {
    userId,
    dailyStudyTargetMin: user.dailyStudyTargetMin ?? 45,
    targetExamDate: user.targetExamDate,
    weakSubjects: user.weakSubjects,
    primaryFocus: user.primaryFocus,
    curriculumId: user.curriculumId,
    learningGoals: user.learningGoals,
    preferredExplanationStyle: user.preferredExplanationStyle,
  };

  // Concept states + graph edges + recent attempts in parallel
  const [states, relations, attempts, subjectMasteries] = await Promise.all([
    prisma.conceptState.findMany({
      where: { userId },
      include: {
        concept: {
          include: { topic: { include: { subject: true } } },
        },
      },
    }),
    prisma.conceptRelation.findMany({
      where: {
        OR: [
          {
            fromConceptId: {
              in: undefined as unknown as string[], // filled below after states
            },
          },
        ],
      },
      take: 0, // placeholder — we load properly after
    }),
    prisma.questionAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        question: {
          select: {
            id: true,
            conceptId: true,
            subjectId: true,
            concept: { select: { name: true } },
          },
        },
      },
    }),
    prisma.subjectMastery.findMany({
      where: { userId },
      include: { subject: true },
    }),
  ]);

  const conceptIds = states.map((s) => s.conceptId);
  const edgesRaw =
    conceptIds.length > 0
      ? await prisma.conceptRelation.findMany({
          where: {
            OR: [
              { fromConceptId: { in: conceptIds } },
              { toConceptId: { in: conceptIds } },
            ],
          },
          include: {
            fromConcept: { select: { name: true } },
            toConcept: { select: { name: true } },
          },
        })
      : [];

  const edges: ConceptEdge[] = edgesRaw.map((e) => ({
    fromConceptId: e.fromConceptId,
    toConceptId: e.toConceptId,
    relationType: e.relationType as ConceptEdge["relationType"],
    strength: e.strength,
    fromName: e.fromConcept.name,
    toName: e.toConcept.name,
  }));

  // Build snapshots
  const snapshots: ConceptSnapshot[] = [];
  for (const s of states) {
    const conceptAttempts = attempts.filter(
      (a) => a.question.conceptId === s.conceptId
    );
    const correctCount = conceptAttempts.filter((a) => a.isCorrect).length;
    const times = conceptAttempts
      .map((a) => a.timeSpentMs)
      .filter((t): t is number => t != null);
    const averageTimeMs =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

    snapshots.push({
      conceptId: s.conceptId,
      conceptName: s.concept.name,
      topicId: s.concept.topicId,
      topicName: s.concept.topic.name,
      subjectId: s.concept.topic.subjectId,
      subjectName: s.concept.topic.subject.name,
      masteryScore: applyDecay(s.masteryScore, s.lastReviewedAt),
      confidence: s.confidence,
      attemptCount: conceptAttempts.length,
      correctCount,
      averageTimeMs,
      sm2: {
        easeFactor: s.easeFactor,
        intervalDays: s.intervalDays,
        repetitions: s.repetitions,
        nextReviewAt: s.nextReviewAt,
        lastReviewedAt: s.lastReviewedAt,
      },
    });
  }

  const weakConcepts = detectWeakTopics(snapshots, edges);
  const strongConcepts = snapshots
    .filter((c) => c.masteryScore >= 75 && c.confidence >= 60)
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .slice(0, 8)
    .map((c) => ({
      conceptId: c.conceptId,
      name: c.conceptName,
      masteryScore: c.masteryScore,
      confidence: c.confidence,
    }));

  const topicMastery = snapshots.map((c) => ({
    conceptId: c.conceptId,
    name: c.conceptName,
    masteryScore: c.masteryScore,
    confidence: c.confidence,
    retention: estimateRetention(c.sm2, c.masteryScore),
  }));

  const upcomingReviews = snapshots
    .filter((c) => c.sm2.nextReviewAt)
    .map((c) => ({
      conceptId: c.conceptId,
      name: c.conceptName,
      nextReviewAt: c.sm2.nextReviewAt as Date,
      retention: estimateRetention(c.sm2, c.masteryScore),
    }))
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())
    .slice(0, 15);

  const recentMistakes = attempts
    .filter((a) => !a.isCorrect)
    .slice(0, 10)
    .map((a) => ({
      questionId: a.questionId,
      conceptId: a.question.conceptId,
      conceptName: a.question.concept?.name,
      createdAt: a.createdAt,
    }));

  const subjects = subjectMasteries.map((sm) => ({
    subjectId: sm.subjectId,
    name: sm.subject.name,
    mastery: sm.masteryScore,
    attempted: sm.questionsAttempted,
    correct: sm.questionsCorrect,
  }));

  const totalAttempted = attempts.length;
  const totalCorrect = attempts.filter((a) => a.isCorrect).length;

  const readiness = calculateExamReadiness({
    concepts: snapshots,
    subjects,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalAttempted,
    totalCorrect,
    ctx,
  });

  const insights = assembleInsights({
    concepts: snapshots,
    subjects,
    attempts: attempts.map((a) => ({
      isCorrect: a.isCorrect,
      createdAt: a.createdAt,
      timeSpentMs: a.timeSpentMs,
      subjectId: a.question.subjectId,
      subjectName: null,
    })),
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    readiness,
    ctx,
  });

  let currentPlan: DailyPlan | null = null;
  try {
    currentPlan = buildDailyPlan(snapshots, ctx);
  } catch {
    currentPlan = null;
  }

  return {
    userId,
    preferredExplanationStyle: user.preferredExplanationStyle,
    learningGoals: user.learningGoals,
    dailyStudyTargetMin: user.dailyStudyTargetMin ?? 45,
    examDate: user.targetExamDate,
    examReadiness: readiness,
    currentStreak: user.currentStreak,
    weakConcepts,
    strongConcepts,
    topicMastery,
    upcomingReviews,
    recentMistakes,
    currentPlan,
    narratives: insights.narratives,
    primaryFocus: user.primaryFocus,
  };
}
