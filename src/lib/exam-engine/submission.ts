/**
 * Answer drafts + final submission marking pipeline.
 */

import { prisma } from "@/lib/prisma";
import { markObjectiveAnswer } from "@/lib/assessment";
import { updateAfterQuestionAttempt } from "@/lib/learning-brain";
import { updateQuestionStatistics } from "@/lib/question-bank";
import type { AnswerDraft } from "@/lib/assessment";
import type { MarkedAnswer } from "@/lib/assessment";

export function upsertAnswerDraft(
  answers: Record<string, AnswerDraft>,
  questionId: string,
  patch: Partial<AnswerDraft>
): Record<string, AnswerDraft> {
  const prev = answers[questionId] ?? {
    questionId,
    selectedKey: null,
    markedForReview: false,
    timeSpentMs: 0,
    visited: true,
  };
  return {
    ...answers,
    [questionId]: {
      ...prev,
      ...patch,
      questionId,
      visited: true,
      answeredAt:
        patch.selectedKey !== undefined
          ? new Date().toISOString()
          : prev.answeredAt ?? null,
    },
  };
}

/**
 * On final submit: mark every question, write QuestionAttempts,
 * update Learning Brain + Question stats.
 */
export async function finalizeExamAnswers(opts: {
  userId: string;
  examId: string;
  questionIds: string[];
  answers: Record<string, AnswerDraft>;
}): Promise<MarkedAnswer[]> {
  const marked: MarkedAnswer[] = [];

  for (const qid of opts.questionIds) {
    const draft = opts.answers[qid];
    const selectedKey = draft?.selectedKey ?? null;
    const timeSpentMs = draft?.timeSpentMs ?? null;
    const result = await markObjectiveAnswer(qid, selectedKey, timeSpentMs);
    marked.push(result);

    // Persist attempt
    await prisma.questionAttempt.create({
      data: {
        userId: opts.userId,
        questionId: qid,
        quizAttemptId: opts.examId,
        selectedKey,
        isCorrect: result.isCorrect,
        timeSpentMs: timeSpentMs ?? undefined,
        skipped: selectedKey == null,
      },
    });

    await updateQuestionStatistics(qid, {
      isCorrect: result.isCorrect,
      timeSpentMs,
      skipped: selectedKey == null,
    });

    // Learning Brain only for answered items
    if (selectedKey != null) {
      await updateAfterQuestionAttempt({
        userId: opts.userId,
        questionId: qid,
        conceptId: result.conceptId,
        subjectId: result.subjectId,
        isCorrect: result.isCorrect,
        difficulty: result.difficulty,
        timeSpentMs,
        estimatedTimeSec: result.estimatedTimeSec,
        selectedKey,
        quizAttemptId: opts.examId,
      });
    }
  }

  return marked;
}
