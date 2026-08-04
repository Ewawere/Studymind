/**
 * StudyMind Question Bank — public API
 *
 * Single source of truth for learning content.
 * Reusable by quizzes, AI Tutor, admin tools, mobile apps.
 *
 * @example
 * import {
 *   importQuestions,
 *   searchQuestions,
 *   getQuestionAIContext,
 *   updateQuestionStatistics,
 * } from "@/lib/question-bank";
 */

import { prisma } from "@/lib/prisma";
import type { QuestionInput } from "./types";
import { validateQuestion, hashStem } from "./validation";
import { detectDuplicates } from "./duplicates";
import { importQuestions } from "./import";
import {
  searchQuestions,
  getQuestionById,
  getQuestionsByTopic,
  getQuestionsByConcept,
  getQuestionAIContext,
} from "./search";
import {
  updateQuestionStatistics,
  recalibrateDifficulty,
  recalibrateAllDifficulties,
} from "./statistics";

export * from "./types";
export { validateQuestion, hashStem, normalizeStem } from "./validation";
export { detectDuplicates, jaccard, tokenSet } from "./duplicates";
export { importQuestions } from "./import";
export {
  searchQuestions,
  getQuestionById,
  getQuestionsByTopic,
  getQuestionsByConcept,
  getQuestionAIContext,
} from "./search";
export {
  updateQuestionStatistics,
  recalibrateDifficulty,
  recalibrateAllDifficulties,
} from "./statistics";
export { parseCsvQuestions, parseJsonQuestions } from "./parse";

/**
 * Edit a question: creates a new revision, never changes the permanent ID.
 * Historical attempts remain valid.
 */
export async function reviseQuestion(
  questionId: string,
  patch: Partial<QuestionInput> & { changeNote?: string; changedBy?: string }
) {
  const existing = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: true },
  });

  const nextRevision = existing.revisionNumber + 1;

  return prisma.$transaction(async (tx) => {
    // Snapshot current state
    await tx.questionRevision.create({
      data: {
        questionId,
        revisionNumber: nextRevision,
        snapshot: {
          stem: existing.stem,
          correctKey: existing.correctKey,
          explanation: existing.explanation,
          authorDifficulty: existing.authorDifficulty,
          options: existing.options,
        },
        changedBy: patch.changedBy,
        changeNote: patch.changeNote ?? "Revision",
      },
    });

    const updated = await tx.question.update({
      where: { id: questionId },
      data: {
        stem: patch.stem ?? existing.stem,
        stemHash: patch.stem ? hashStem(patch.stem) : existing.stemHash,
        correctKey: patch.correctKey ?? existing.correctKey,
        explanation: patch.explanation ?? existing.explanation,
        // authorDifficulty intentionally NOT updated from patch unless explicit
        authorDifficulty:
          patch.authorDifficulty ?? existing.authorDifficulty,
        learningObjectives:
          patch.learningObjectives ?? existing.learningObjectives,
        estimatedTimeSec:
          patch.estimatedTimeSec ?? existing.estimatedTimeSec,
        source: patch.source ?? existing.source,
        year: patch.year ?? existing.year,
        bloomLevel: patch.bloomLevel
          ? String(patch.bloomLevel).toLowerCase()
          : existing.bloomLevel,
        keywords: patch.keywords ?? existing.keywords,
        commonMistakes: patch.commonMistakes ?? existing.commonMistakes ?? undefined,
        revisionNumber: nextRevision,
      },
    });

    if (patch.options) {
      await tx.questionOption.deleteMany({ where: { questionId } });
      await tx.questionOption.createMany({
        data: patch.options.map((o, idx) => ({
          questionId,
          key: o.key,
          text: o.text,
          order: idx,
          isCorrect:
            o.key === (patch.correctKey ?? existing.correctKey) ||
            !!o.isCorrect,
        })),
      });
    }

    return updated;
  });
}

export async function archiveQuestion(questionId: string) {
  return prisma.question.update({
    where: { id: questionId },
    data: { status: "ARCHIVED", isActive: false },
  });
}

export async function restoreQuestion(questionId: string) {
  return prisma.question.update({
    where: { id: questionId },
    data: { status: "ACTIVE", isActive: true },
  });
}
