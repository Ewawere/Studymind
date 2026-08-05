/**
 * Shared Assessment Core types
 * Used by Practice Engine and Exam Engine.
 */

export interface MarkedAnswer {
  questionId: string;
  isCorrect: boolean;
  correctKey: string | null;
  selectedKey: string | null;
  explanation: string | null;
  commonMistakes: { mistake: string; why?: string }[];
  learningObjectives: string[];
  conceptId: string | null;
  topicId: string | null;
  subjectId: string;
  difficulty: number;
  estimatedTimeSec: number | null;
  timeSpentMs?: number | null;
}

export interface AnswerDraft {
  questionId: string;
  selectedKey: string | null;
  markedForReview: boolean;
  timeSpentMs: number;
  visited: boolean;
  answeredAt?: string | null;
}

export interface ScoreSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number; // 0–100
  percentage: number;
  grade: string;
}

export interface ConceptBreakdown {
  conceptId: string;
  name?: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface SubjectBreakdown {
  subjectId: string;
  name?: string;
  correct: number;
  total: number;
  accuracy: number;
}
