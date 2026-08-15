/**
 * Practice session lifecycle
 *
 * create → getNext → submit/skip → … → finish
 * Learning Brain + Question stats update on every answer.
 */

import { prisma } from "@/lib/prisma";
import { updateAfterQuestionAttempt } from "@/lib/learning-brain";
import { updateQuestionStatistics } from "@/lib/question-bank";
import { selectQuestionQueue } from "./selector";
import { markAnswer, buildFeedback } from "./scoring";
import { xpForAnswer, xpForSessionBonus, awardXp } from "./streaks";
import { buildSessionReport } from "./analytics";
import {
  nextTargetDifficulty,
  shouldInjectEasierQuestion,
} from "./adaptive";
import type {
  CreateSessionOptions,
  SessionSnapshot,
  PracticeQuestionView,
  SubmitAnswerInput,
  AnswerFeedback,
  SessionReport,
  SessionMode,
  AdaptiveConfig,
} from "./types";
import type { Prisma } from "@prisma/client";

function toSnapshot(row: {
  id: string;
  userId: string;
  mode: string;
  status: string;
  title: string | null;
  subjectIds: string[];
  topicIds: string[];
  conceptIds: string[];
  questionQueue: string[];
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  skippedCount: number;
  score: number | null;
  xpEarned: number;
  timeLimitSec: number | null;
  startedAt: Date;
  completedAt: Date | null;
}): SessionSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    mode: row.mode as SessionMode,
    status: row.status as SessionSnapshot["status"],
    title: row.title,
    subjectIds: row.subjectIds,
    topicIds: row.topicIds,
    conceptIds: row.conceptIds,
    questionQueue: row.questionQueue,
    currentIndex: row.currentIndex,
    totalQuestions: row.totalQuestions,
    correctCount: row.correctCount,
    skippedCount: row.skippedCount,
    score: row.score,
    xpEarned: row.xpEarned,
    timeLimitSec: row.timeLimitSec,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function readAdaptive(config: unknown): AdaptiveConfig {
  const c = (config ?? {}) as Partial<AdaptiveConfig>;
  return {
    targetDifficulty: c.targetDifficulty ?? null,
    recentResults: Array.isArray(c.recentResults) ? c.recentResults : [],
    consecutiveWrong: c.consecutiveWrong ?? 0,
  };
}

export async function createPracticeSession(
  options: CreateSessionOptions
): Promise<SessionSnapshot> {
  const queue = await selectQuestionQueue(options);
  if (queue.length === 0) {
    throw new Error("No questions available for the selected filters");
  }

  const mode = options.mode ?? "practice";
  const session = await prisma.quizAttempt.create({
    data: {
      userId: options.userId,
      mode,
      status: "active",
      title: options.title ?? `${mode} session`,
      subjectIds: options.subjectIds ?? [],
      topicIds: options.topicIds ?? [],
      conceptIds: options.conceptIds ?? [],
      questionQueue: queue,
      currentIndex: 0,
      totalQuestions: queue.length,
      timeLimitSec: options.timeLimitSec ?? null,
      config: {
        targetDifficulty: options.targetDifficulty ?? (mode === "challenge" ? 4 : 3),
        recentResults: [],
        consecutiveWrong: 0,
      } satisfies AdaptiveConfig,
    },
  });

  return toSnapshot(session);
}

export async function resumeSession(
  sessionId: string
): Promise<SessionSnapshot> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "active") {
    throw new Error(`Session is ${session.status}, cannot resume`);
  }
  return toSnapshot(session);
}

export async function getNextQuestion(
  sessionId: string
): Promise<PracticeQuestionView | null> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "active") return null;
  if (session.currentIndex >= session.questionQueue.length) return null;

  const questionId = session.questionQueue[session.currentIndex];
  const q = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { orderBy: { order: "asc" } },
      media: { orderBy: { order: "asc" } },
    },
  });

  return {
    questionId: q.id,
    index: session.currentIndex,
    total: session.totalQuestions,
    stem: q.stem,
    type: q.type,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    difficulty: Math.round(q.calculatedDifficulty ?? q.authorDifficulty),
    estimatedTimeSec: q.estimatedTimeSec,
    media: q.media.map((m) => ({
      type: m.type,
      url: m.url,
      altText: m.altText,
    })),
    hasHint: session.mode === "tutor",
  };
}

export async function submitAnswer(
  input: SubmitAnswerInput
): Promise<{ feedback: AnswerFeedback; session: SessionSnapshot }> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: input.sessionId },
  });
  if (session.status !== "active") {
    throw new Error("Session is not active");
  }

  const expectedId = session.questionQueue[session.currentIndex];
  if (expectedId !== input.questionId) {
    throw new Error("Question does not match current session position");
  }

  const marked = await markAnswer(input.questionId, input.selectedKey);
  const xpGained = xpForAnswer(marked.isCorrect, marked.difficulty);

  // Learning Brain update (creates QuestionAttempt + mastery/SM-2/confidence)
  const brain = await updateAfterQuestionAttempt({
    userId: session.userId,
    questionId: input.questionId,
    conceptId: marked.conceptId,
    subjectId: marked.subjectId,
    isCorrect: marked.isCorrect,
    difficulty: marked.difficulty,
    timeSpentMs: input.timeSpentMs,
    estimatedTimeSec: marked.estimatedTimeSec,
    selectedKey: input.selectedKey,
    quizAttemptId: session.id,
  });

  await updateQuestionStatistics(input.questionId, {
    isCorrect: marked.isCorrect,
    timeSpentMs: input.timeSpentMs,
  });

  await awardXp(session.userId, xpGained);

  // Adaptive difficulty tracking
  const adaptive = readAdaptive(session.config);
  const recentResults = [...adaptive.recentResults, marked.isCorrect].slice(-10);
  const consecutiveWrong = marked.isCorrect
    ? 0
    : adaptive.consecutiveWrong + 1;
  const targetDifficulty = nextTargetDifficulty(
    adaptive.targetDifficulty ?? marked.difficulty,
    recentResults
  );

  const newCorrect = session.correctCount + (marked.isCorrect ? 1 : 0);
  const newIndex = session.currentIndex + 1;
  const answered = newIndex - session.skippedCount;

  const updated = await prisma.quizAttempt.update({
    where: { id: session.id },
    data: {
      currentIndex: newIndex,
      correctCount: newCorrect,
      xpEarned: session.xpEarned + xpGained,
      score: (newCorrect / session.totalQuestions) * 100,
      config: {
        targetDifficulty,
        recentResults,
        consecutiveWrong,
        injectEasier: shouldInjectEasierQuestion(consecutiveWrong),
      },
    },
  });

  const feedback = buildFeedback(marked, {
    xpGained,
    masteryDelta: brain.conceptMastery,
    confidence: brain.confidence,
    progress: {
      answered: Math.max(0, answered),
      correct: newCorrect,
      skipped: session.skippedCount,
      remaining: Math.max(0, session.totalQuestions - newIndex),
    },
  });

  return { feedback, session: toSnapshot(updated) };
}

export async function skipQuestion(
  sessionId: string,
  questionId: string
): Promise<SessionSnapshot> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (session.status !== "active") throw new Error("Session is not active");

  const expectedId = session.questionQueue[session.currentIndex];
  if (expectedId !== questionId) {
    throw new Error("Question does not match current session position");
  }

  await prisma.questionAttempt.create({
    data: {
      userId: session.userId,
      questionId,
      quizAttemptId: session.id,
      isCorrect: false,
      skipped: true,
    },
  });

  await updateQuestionStatistics(questionId, {
    isCorrect: false,
    skipped: true,
  });

  const updated = await prisma.quizAttempt.update({
    where: { id: sessionId },
    data: {
      currentIndex: session.currentIndex + 1,
      skippedCount: session.skippedCount + 1,
    },
  });

  return toSnapshot(updated);
}

export async function finishSession(
  sessionId: string
): Promise<{ session: SessionSnapshot; report: SessionReport }> {
  const session = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: sessionId },
  });

  const attempts = await prisma.questionAttempt.findMany({
    where: { quizAttemptId: sessionId, skipped: false },
  });
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracy = attempts.length > 0 ? correct / attempts.length : 0;

  const bonus = xpForSessionBonus(accuracy, attempts.length);
  if (bonus > 0) await awardXp(session.userId, bonus);

  const report = await buildSessionReport(sessionId);

  const updated = await prisma.quizAttempt.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
      score: accuracy * 100,
      correctCount: correct,
      xpEarned: session.xpEarned + bonus,
      report: report as Prisma.InputJsonValue,
    },
  });

  return { session: toSnapshot(updated), report };
}
