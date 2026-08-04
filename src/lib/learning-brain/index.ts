/**
 * StudyMind Learning Brain
 *
 * Standalone service — no UI dependencies.
 * Call these functions from quizzes, AI Tutor, planner, and future mobile apps.
 *
 * @example
 * import { updateAfterQuestionAttempt, generateDailyPlan } from "@/lib/learning-brain";
 */

import { prisma } from "@/lib/prisma";
import {
  calculateTopicMastery,
  applyDecay,
  rollupSubjectMastery,
} from "./mastery";
import {
  deriveQuality,
  scheduleNextReview,
  initialSM2State,
} from "./sm2";
import {
  detectWeakTopics,
  recommendNextTopics,
  type ConceptSnapshot,
} from "./recommendations";
import { generateDailyPlan as buildDailyPlan } from "./planner";
import {
  calculateExamReadiness as calcReadiness,
  generateLearningInsights as genInsights,
  type SubjectRollup,
} from "./analytics";
import type {
  QuestionAttemptInput,
  UserLearningContext,
  DailyPlan,
  Recommendation,
  WeakTopic,
  ExamReadiness,
  LearningInsights,
  SM2State,
} from "./types";

// Re-export pure functions & types for direct use / testing
export * from "./types";
export { calculateTopicMastery, applyDecay, rollupSubjectMastery } from "./mastery";
export {
  deriveQuality,
  scheduleNextReview,
  initialSM2State,
  isDue,
} from "./sm2";
export { detectWeakTopics, recommendNextTopics } from "./recommendations";
export { generateDailyPlan as buildPlanFromSnapshots } from "./planner";
export {
  calculateExamReadiness as computeReadiness,
  generateLearningInsights as computeInsights,
} from "./analytics";

// ─────────────────────────────────────────
// Core: update after a question attempt (transactional)
// ─────────────────────────────────────────

export async function updateAfterQuestionAttempt(
  input: QuestionAttemptInput
): Promise<{
  conceptMastery?: number;
  subjectMastery?: number;
  sm2?: SM2State;
}> {
  const {
    userId,
    questionId,
    conceptId,
    subjectId,
    isCorrect,
    difficulty,
    timeSpentMs,
    estimatedTimeSec,
    selectedKey,
    quizAttemptId,
  } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Record the attempt
    await tx.questionAttempt.create({
      data: {
        userId,
        questionId,
        isCorrect,
        selectedKey: selectedKey ?? null,
        timeSpentMs: timeSpentMs ?? null,
        quizAttemptId: quizAttemptId ?? null,
      },
    });

    let conceptMastery: number | undefined;
    let sm2Result: SM2State | undefined;
    let subjectMastery: number | undefined;

    // 2. Update concept-level mastery + SM-2
    if (conceptId) {
      const existing = await tx.conceptState.findUnique({
        where: { userId_conceptId: { userId, conceptId } },
      });

      const prevMastery = existing?.masteryScore ?? 0;
      const attemptCount = existing
        ? await tx.questionAttempt.count({
            where: {
              userId,
              question: { conceptId },
            },
          })
        : 0;

      const mastery = calculateTopicMastery({
        previousMastery: prevMastery,
        isCorrect,
        difficulty,
        timeSpentMs,
        estimatedTimeSec,
        attemptCount,
      });

      const quality = deriveQuality(isCorrect, timeSpentMs, estimatedTimeSec);
      const prevSM2: SM2State = existing
        ? {
            easeFactor: existing.easeFactor,
            intervalDays: existing.intervalDays,
            repetitions: existing.repetitions,
            nextReviewAt: existing.nextReviewAt,
            lastReviewedAt: existing.lastReviewedAt,
          }
        : initialSM2State();

      const sm2 = scheduleNextReview(prevSM2, quality);

      await tx.conceptState.upsert({
        where: { userId_conceptId: { userId, conceptId } },
        create: {
          userId,
          conceptId,
          masteryScore: mastery.masteryScore,
          easeFactor: sm2.easeFactor,
          intervalDays: sm2.intervalDays,
          repetitions: sm2.repetitions,
          nextReviewAt: sm2.nextReviewAt,
          lastReviewedAt: sm2.lastReviewedAt,
        },
        update: {
          masteryScore: mastery.masteryScore,
          easeFactor: sm2.easeFactor,
          intervalDays: sm2.intervalDays,
          repetitions: sm2.repetitions,
          nextReviewAt: sm2.nextReviewAt,
          lastReviewedAt: sm2.lastReviewedAt,
        },
      });

      conceptMastery = mastery.masteryScore;
      sm2Result = sm2;
    }

    // 3. Roll up to subject mastery
    if (subjectId) {
      const conceptStates = await tx.conceptState.findMany({
        where: {
          userId,
          concept: { topic: { subjectId } },
        },
        include: {
          concept: {
            include: {
              questions: {
                select: { id: true },
              },
            },
          },
        },
      });

      // Simpler rollup from concept states we have
      const rollup = rollupSubjectMastery(
        conceptStates.map((cs) => ({
          masteryScore: cs.masteryScore,
          attemptCount: cs.repetitions,
        }))
      );

      const priorAttempts = await tx.questionAttempt.count({
        where: { userId, question: { subjectId } },
      });
      const priorCorrect = await tx.questionAttempt.count({
        where: { userId, question: { subjectId }, isCorrect: true },
      });

      await tx.subjectMastery.upsert({
        where: { userId_subjectId: { userId, subjectId } },
        create: {
          userId,
          subjectId,
          masteryScore: rollup,
          questionsAttempted: priorAttempts,
          questionsCorrect: priorCorrect,
          lastPracticedAt: new Date(),
        },
        update: {
          masteryScore: rollup,
          questionsAttempted: priorAttempts,
          questionsCorrect: priorCorrect,
          lastPracticedAt: new Date(),
        },
      });

      subjectMastery = rollup;
    }

    // 4. Learning event + streak update
    await tx.learningEvent.create({
      data: {
        userId,
        type: "question_attempt",
        payload: {
          questionId,
          conceptId,
          subjectId,
          isCorrect,
          difficulty,
        },
      },
    });

    await updateStreak(tx, userId);

    return { conceptMastery, subjectMastery, sm2: sm2Result };
  });
}

// ─────────────────────────────────────────
// Helpers to load snapshots from DB
// ─────────────────────────────────────────

async function loadConceptSnapshots(
  userId: string,
  subjectId?: string
): Promise<ConceptSnapshot[]> {
  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      ...(subjectId
        ? { concept: { topic: { subjectId } } }
        : {}),
    },
    include: {
      concept: {
        include: {
          topic: {
            include: { subject: true },
          },
        },
      },
    },
  });

  // Also pull attempt stats per concept
  const snapshots: ConceptSnapshot[] = [];

  for (const s of states) {
    const attempts = await prisma.questionAttempt.findMany({
      where: {
        userId,
        question: { conceptId: s.conceptId },
      },
      select: { isCorrect: true, timeSpentMs: true },
    });

    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const times = attempts
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
      attemptCount: attempts.length,
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

  return snapshots;
}

async function loadUserContext(userId: string): Promise<UserLearningContext> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    userId,
    dailyStudyTargetMin: user.dailyStudyTargetMin ?? 45,
    targetExamDate: user.targetExamDate,
    weakSubjects: user.weakSubjects,
    primaryFocus: user.primaryFocus,
    curriculumId: user.curriculumId,
  };
}

// ─────────────────────────────────────────
// Public high-level API
// ─────────────────────────────────────────

export async function getWeakTopics(
  userId: string,
  subjectId?: string
): Promise<WeakTopic[]> {
  const snapshots = await loadConceptSnapshots(userId, subjectId);
  return detectWeakTopics(snapshots);
}

export async function getRecommendations(
  userId: string
): Promise<Recommendation[]> {
  const [snapshots, ctx] = await Promise.all([
    loadConceptSnapshots(userId),
    loadUserContext(userId),
  ]);
  return recommendNextTopics(snapshots, ctx);
}

export async function generateDailyPlan(
  userId: string
): Promise<DailyPlan> {
  const [snapshots, ctx] = await Promise.all([
    loadConceptSnapshots(userId),
    loadUserContext(userId),
  ]);
  return buildDailyPlan(snapshots, ctx);
}

export async function calculateExamReadiness(
  userId: string
): Promise<ExamReadiness> {
  const input = await buildAnalyticsInput(userId);
  return calcReadiness(input);
}

export async function generateLearningInsights(
  userId: string
): Promise<LearningInsights> {
  const input = await buildAnalyticsInput(userId);
  return genInsights(input);
}

async function buildAnalyticsInput(userId: string) {
  const [snapshots, ctx, user, subjectMasteries, aggregates] =
    await Promise.all([
      loadConceptSnapshots(userId),
      loadUserContext(userId),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.subjectMastery.findMany({
        where: { userId },
        include: { subject: true },
      }),
      prisma.questionAttempt.aggregate({
        where: { userId },
        _count: { _all: true },
        _avg: { timeSpentMs: true },
      }),
    ]);

  const correctCount = await prisma.questionAttempt.count({
    where: { userId, isCorrect: true },
  });

  const subjects: SubjectRollup[] = subjectMasteries.map((sm) => ({
    subjectId: sm.subjectId,
    name: sm.subject.name,
    mastery: sm.masteryScore,
    attempted: sm.questionsAttempted,
    correct: sm.questionsCorrect,
  }));

  return {
    concepts: snapshots,
    subjects,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalAttempted: aggregates._count._all,
    totalCorrect: correctCount,
    averageResponseMs: aggregates._avg.timeSpentMs,
    ctx,
  };
}

// ─────────────────────────────────────────
// Streak helper
// ─────────────────────────────────────────

async function updateStreak(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let currentStreak = user.currentStreak;
  let longestStreak = user.longestStreak;

  if (user.lastStudyDate) {
    const last = new Date(user.lastStudyDate);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffDays = Math.round(
      (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // already studied today — no change
    } else if (diffDays === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak;

  await tx.user.update({
    where: { id: userId },
    data: {
      currentStreak,
      longestStreak,
      lastStudyDate: now,
    },
  });
}
