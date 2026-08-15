/**
 * CBT Exam session lifecycle
 *
 * createExam → startExam → saveAnswer / navigate → submitExam
 * Uses QuizAttempt row with mode = exam mode and rich config JSON.
 */

import { prisma } from "@/lib/prisma";
import type { AnswerDraft } from "@/lib/assessment";
import { selectExamQuestions } from "./selector";
import {
  computeEndsAt,
  remainingSeconds,
  isExpired,
} from "./timer";
import {
  paletteFromState,
  resolveNavigateIndex,
  markVisited,
} from "./navigation";
import { upsertAnswerDraft, finalizeExamAnswers } from "./submission";
import { buildExamReport } from "./analytics";
import {
  appendIntegrityEvent,
  assertCanSubmit,
  assertExamActive,
} from "./integrity";
import type {
  ExamConfig,
  ExamState,
  ExamQuestionView,
  ExamReport,
  ExamRules,
  ExamMode,
  ExamStatus,
  IntegrityEvent,
  PaletteItem,
} from "./types";
import { DEFAULT_RULES } from "./types";
import type { Prisma } from "@prisma/client";

interface ExamConfigPayload {
  rules: ExamRules;
  answers: Record<string, AnswerDraft>;
  endsAt: string | null;
  integrityEvents: IntegrityEvent[];
  selection: string;
}

function readConfig(raw: unknown): ExamConfigPayload {
  const c = (raw ?? {}) as Partial<ExamConfigPayload>;
  return {
    rules: { ...DEFAULT_RULES, ...(c.rules ?? {}) },
    answers: c.answers ?? {},
    endsAt: c.endsAt ?? null,
    integrityEvents: c.integrityEvents ?? [],
    selection: c.selection ?? "random",
  };
}

function toState(row: {
  id: string;
  userId: string;
  mode: string;
  status: string;
  title: string | null;
  questionQueue: string[];
  currentIndex: number;
  timeLimitSec: number | null;
  startedAt: Date;
  completedAt: Date | null;
  config: unknown;
}): ExamState {
  const cfg = readConfig(row.config);
  const now = new Date();
  const endsAt = cfg.endsAt ? new Date(cfg.endsAt) : null;
  return {
    id: row.id,
    userId: row.userId,
    mode: row.mode as ExamMode,
    status: row.status as ExamStatus,
    title: row.title,
    questionIds: row.questionQueue,
    currentIndex: row.currentIndex,
    answers: cfg.answers,
    timeLimitSec: row.timeLimitSec ?? 0,
    startedAt: row.startedAt.toISOString(),
    endsAt: endsAt?.toISOString() ?? null,
    serverNow: now.toISOString(),
    remainingSec: endsAt ? remainingSeconds(endsAt, now) : 0,
    rules: cfg.rules,
    submittedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function createExam(
  userId: string,
  config: ExamConfig
): Promise<ExamState> {
  const rules: ExamRules = { ...DEFAULT_RULES, ...config.rules };
  const questionIds = await selectExamQuestions({
    ...config,
    rules,
  });

  const row = await prisma.quizAttempt.create({
    data: {
      userId,
      mode: config.mode,
      status: "draft",
      title: config.title ?? `${config.mode} exam`,
      subjectIds: config.subjectIds ?? [],
      topicIds: config.topicIds ?? [],
      conceptIds: config.conceptIds ?? [],
      questionQueue: questionIds,
      currentIndex: 0,
      totalQuestions: questionIds.length,
      timeLimitSec: config.timeLimitSec,
      config: {
        rules,
        answers: {},
        endsAt: null,
        integrityEvents: [],
        selection: config.selection,
      } satisfies ExamConfigPayload as Prisma.InputJsonValue,
    },
  });

  return toState(row);
}

export async function startExam(examId: string): Promise<ExamState> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  if (row.status !== "draft" && row.status !== "paused") {
    throw new Error(`Cannot start exam in status ${row.status}`);
  }

  const now = new Date();
  const cfg = readConfig(row.config);
  const endsAt = computeEndsAt(now, row.timeLimitSec ?? 3600);
  cfg.endsAt = endsAt.toISOString();
  cfg.integrityEvents = appendIntegrityEvent(cfg.integrityEvents, "resume");

  if (row.questionQueue[0]) {
    cfg.answers = markVisited(cfg.answers, row.questionQueue[0]);
  }

  const updated = await prisma.quizAttempt.update({
    where: { id: examId },
    data: {
      status: "active",
      startedAt: now,
      config: cfg as Prisma.InputJsonValue,
    },
  });

  return toState(updated);
}

export async function resumeExam(examId: string): Promise<ExamState> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  const cfg = readConfig(row.config);
  const endsAt = cfg.endsAt ? new Date(cfg.endsAt) : null;

  if (endsAt && isExpired(endsAt) && cfg.rules.autoSubmitOnTimeout) {
    const result = await submitExam(examId);
    return result;
  }

  if (row.status === "submitted" || row.status === "expired") {
    return toState(row);
  }

  cfg.integrityEvents = appendIntegrityEvent(cfg.integrityEvents, "resume");
  const updated = await prisma.quizAttempt.update({
    where: { id: examId },
    data: {
      status: "active",
      config: cfg as Prisma.InputJsonValue,
    },
  });
  return toState(updated);
}

export async function getExamQuestion(
  examId: string,
  index?: number
): Promise<{ question: ExamQuestionView; palette: PaletteItem[]; state: ExamState }> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  const state = toState(row);
  assertExamActive(state.status);

  if (state.endsAt && isExpired(new Date(state.endsAt)) && state.rules.autoSubmitOnTimeout) {
    await submitExam(examId);
    throw new Error("Exam auto-submitted due to timeout");
  }

  const idx = index ?? state.currentIndex;
  const questionId = state.questionIds[idx];
  if (!questionId) throw new Error("Invalid question index");

  const q = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { orderBy: { order: "asc" } },
      media: { orderBy: { order: "asc" } },
    },
  });

  const draft = state.answers[questionId];
  let status: ExamQuestionView["status"] = "not_visited";
  if (draft?.markedForReview) status = "marked";
  else if (draft?.selectedKey) status = "answered";
  else if (draft?.visited) status = "visited";

  const question: ExamQuestionView = {
    index: idx,
    total: state.questionIds.length,
    questionId: q.id,
    stem: q.stem,
    type: q.type,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    media: q.media.map((m) => ({
      type: m.type,
      url: m.url,
      altText: m.altText,
    })),
    status,
    selectedKey: draft?.selectedKey ?? null,
    markedForReview: draft?.markedForReview ?? false,
  };

  return {
    question,
    palette: paletteFromState({
      questionIds: state.questionIds,
      answers: state.answers,
      currentIndex: idx,
    }),
    state,
  };
}

export async function saveAnswer(opts: {
  examId: string;
  questionId: string;
  selectedKey: string | null;
  timeSpentMs?: number;
}): Promise<ExamState> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: opts.examId },
  });
  const state = toState(row);
  assertExamActive(state.status);

  if (!state.questionIds.includes(opts.questionId)) {
    throw new Error("Question not in this exam");
  }

  const cfg = readConfig(row.config);
  cfg.answers = upsertAnswerDraft(cfg.answers, opts.questionId, {
    selectedKey: opts.selectedKey,
    timeSpentMs:
      (cfg.answers[opts.questionId]?.timeSpentMs ?? 0) +
      (opts.timeSpentMs ?? 0),
  });
  cfg.integrityEvents = appendIntegrityEvent(cfg.integrityEvents, "autosave");

  const updated = await prisma.quizAttempt.update({
    where: { id: opts.examId },
    data: { config: cfg as Prisma.InputJsonValue },
  });
  return toState(updated);
}

export async function markForReview(opts: {
  examId: string;
  questionId: string;
  marked?: boolean;
}): Promise<ExamState> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: opts.examId },
  });
  assertExamActive(row.status);
  const cfg = readConfig(row.config);
  cfg.answers = upsertAnswerDraft(cfg.answers, opts.questionId, {
    markedForReview: opts.marked ?? true,
  });
  const updated = await prisma.quizAttempt.update({
    where: { id: opts.examId },
    data: { config: cfg as Prisma.InputJsonValue },
  });
  return toState(updated);
}

export async function clearAnswer(opts: {
  examId: string;
  questionId: string;
}): Promise<ExamState> {
  return saveAnswer({
    examId: opts.examId,
    questionId: opts.questionId,
    selectedKey: null,
  });
}

export async function navigateQuestion(opts: {
  examId: string;
  target: number | "next" | "prev";
}): Promise<ExamState> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: opts.examId },
  });
  const state = toState(row);
  assertExamActive(state.status);

  const nextIndex = resolveNavigateIndex(
    {
      currentIndex: state.currentIndex,
      questionIds: state.questionIds,
      rules: state.rules,
    },
    opts.target
  );

  const cfg = readConfig(row.config);
  const qid = state.questionIds[nextIndex];
  if (qid) cfg.answers = markVisited(cfg.answers, qid);

  const updated = await prisma.quizAttempt.update({
    where: { id: opts.examId },
    data: {
      currentIndex: nextIndex,
      config: cfg as Prisma.InputJsonValue,
    },
  });
  return toState(updated);
}

export async function recordIntegrityEvent(
  examId: string,
  type: IntegrityEvent["type"],
  meta?: Record<string, unknown>
): Promise<void> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  const cfg = readConfig(row.config);
  cfg.integrityEvents = appendIntegrityEvent(cfg.integrityEvents, type, meta);
  await prisma.quizAttempt.update({
    where: { id: examId },
    data: { config: cfg as Prisma.InputJsonValue },
  });
}

export async function submitExam(
  examId: string
): Promise<ExamState & { report: ExamReport }> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  assertCanSubmit(row.status);

  const cfg = readConfig(row.config);
  cfg.integrityEvents = appendIntegrityEvent(cfg.integrityEvents, "submit");

  const marked = await finalizeExamAnswers({
    userId: row.userId,
    examId,
    questionIds: row.questionQueue,
    answers: cfg.answers,
  });

  const correct = marked.filter((m) => m.isCorrect).length;
  const report = await buildExamReport({
    examId,
    mode: row.mode as ExamMode,
    startedAt: row.startedAt,
    marked,
    integrityEventCount: cfg.integrityEvents.length,
  });

  const updated = await prisma.quizAttempt.update({
    where: { id: examId },
    data: {
      status: "submitted",
      completedAt: new Date(),
      correctCount: correct,
      score: report.summary.percentage,
      report: report as Prisma.InputJsonValue,
      config: cfg as Prisma.InputJsonValue,
    },
  });

  return { ...toState(updated), report };
}

export async function generateExamReport(examId: string): Promise<ExamReport> {
  const row = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: examId },
  });
  if (row.report) return row.report as unknown as ExamReport;
  throw new Error("Exam not submitted yet");
}
