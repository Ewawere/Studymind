/**
 * StudyMind CBT / Exam Engine types
 */

import type { AnswerDraft, ScoreSummary } from "@/lib/assessment";

export type ExamMode =
  | "practice_exam"
  | "waec"
  | "jamb"
  | "post_utme"
  | "university"
  | "mock"
  | "custom"
  | "timed_quiz";

export type ExamStatus =
  | "draft"
  | "active"
  | "paused"
  | "submitted"
  | "expired"
  | "abandoned";

export type SelectionStrategy =
  | "random"
  | "blueprint"
  | "difficulty_balanced"
  | "topic_balanced"
  | "manual";

export type ReviewMode =
  | "disabled"
  | "answers_only"
  | "full_explanations"
  | "mistakes_only";

export interface ExamRules {
  allowBack: boolean;
  allowReview: boolean;
  allowCalculator: boolean;
  autoSubmitOnTimeout: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  reviewMode: ReviewMode;
}

export interface ExamConfig {
  mode: ExamMode;
  title?: string;
  subjectIds?: string[];
  topicIds?: string[];
  conceptIds?: string[];
  questionCount: number;
  timeLimitSec: number;
  selection: SelectionStrategy;
  /** Manual question IDs when selection === "manual" */
  questionIds?: string[];
  difficultyMin?: number;
  difficultyMax?: number;
  rules?: Partial<ExamRules>;
}

export interface ExamState {
  id: string;
  userId: string;
  mode: ExamMode;
  status: ExamStatus;
  title: string | null;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, AnswerDraft>;
  timeLimitSec: number;
  startedAt: string | null;
  endsAt: string | null;
  serverNow: string;
  remainingSec: number;
  rules: ExamRules;
  submittedAt: string | null;
}

export interface ExamQuestionView {
  index: number;
  total: number;
  questionId: string;
  stem: string;
  type: string;
  options: { key: string; text: string }[];
  media: { type: string; url: string; altText?: string | null }[];
  status: "not_visited" | "visited" | "answered" | "marked";
  selectedKey: string | null;
  markedForReview: boolean;
  /** Never expose correctKey during active exam */
}

export interface PaletteItem {
  index: number;
  questionId: string;
  status: "not_visited" | "visited" | "answered" | "marked";
}

export interface IntegrityEvent {
  type: "tab_blur" | "tab_focus" | "paste" | "resume" | "autosave" | "submit";
  at: string;
  meta?: Record<string, unknown>;
}

export interface ExamReport {
  examId: string;
  mode: ExamMode;
  summary: ScoreSummary;
  timeSpentSec: number;
  averageResponseMs: number | null;
  subjectBreakdown: {
    subjectId: string;
    name?: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  topicBreakdown: {
    topicId: string;
    name?: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  weakConcepts: { conceptId: string; name?: string; accuracy: number }[];
  strongConcepts: { conceptId: string; name?: string; accuracy: number }[];
  incorrectQuestionIds: string[];
  skippedQuestionIds: string[];
  recommendedRevision: string[];
  recommendedPractice: string[];
  integrityEventCount: number;
}

export const DEFAULT_RULES: ExamRules = {
  allowBack: true,
  allowReview: true,
  allowCalculator: false,
  autoSubmitOnTimeout: true,
  shuffleQuestions: true,
  shuffleOptions: false,
  reviewMode: "full_explanations",
};
