/**
 * Navigation + palette status.
 */

import type { AnswerDraft, ExamState, PaletteItem } from "./types";

export function paletteFromState(state: {
  questionIds: string[];
  answers: Record<string, AnswerDraft>;
  currentIndex: number;
}): PaletteItem[] {
  return state.questionIds.map((qid, index) => {
    const a = state.answers[qid];
    let status: PaletteItem["status"] = "not_visited";
    if (a?.markedForReview) status = "marked";
    else if (a?.selectedKey) status = "answered";
    else if (a?.visited || index === state.currentIndex) status = "visited";
    return { index, questionId: qid, status };
  });
}

export function resolveNavigateIndex(
  state: { currentIndex: number; questionIds: string[]; rules: { allowBack: boolean } },
  target: number | "next" | "prev"
): number {
  const max = state.questionIds.length - 1;
  let next = state.currentIndex;

  if (target === "next") next = Math.min(max, state.currentIndex + 1);
  else if (target === "prev") {
    if (!state.rules.allowBack) {
      throw new Error("Back navigation is disabled for this exam");
    }
    next = Math.max(0, state.currentIndex - 1);
  } else {
    if (!state.rules.allowBack && target < state.currentIndex) {
      throw new Error("Back navigation is disabled for this exam");
    }
    next = Math.max(0, Math.min(max, target));
  }
  return next;
}

export function markVisited(
  answers: Record<string, AnswerDraft>,
  questionId: string
): Record<string, AnswerDraft> {
  const existing = answers[questionId] ?? {
    questionId,
    selectedKey: null,
    markedForReview: false,
    timeSpentMs: 0,
    visited: false,
  };
  return {
    ...answers,
    [questionId]: { ...existing, visited: true },
  };
}
