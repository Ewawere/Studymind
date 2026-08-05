/**
 * StudyMind Practice Engine — shared types
 */

export type SessionMode =
  | "practice"
  | "exam"
  | "weakness"
  | "revision"
  | "challenge"
  | "tutor";

export type SessionStatus = "active" | "completed" | "abandoned";

export interface CreateSessionOptions {
  userId: string;
  mode?: SessionMode;
  subjectIds?: string[];
  topicIds?: string[];
  conceptIds?: string[];
  questionCount?: number; // default 10
  timeLimitSec?: number | null;
  title?: string;
  /** Target difficulty band for challenge mode */
  targetDifficulty?: number;
}

export interface SessionSnapshot {
  id: string;
  userId: string;
  mode: SessionMode;
  status: SessionStatus;
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
}

export interface PracticeQuestionView {
  questionId: string;
  index: number;
  total: number;
  stem: string;
  type: string;
  options: { key: string; text: string }[];
  difficulty: number;
  estimatedTimeSec: number | null;
  media: { type: string; url: string; altText?: string | null }[];
  /** Only in tutor mode pre-hint flags */
  hasHint: boolean;
}

export interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedKey: string | null;
  timeSpentMs?: number;
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctKey: string | null;
  explanation: string | null;
  commonMistakes: { mistake: string; why?: string }[];
  learningObjectives: string[];
  xpGained: number;
  masteryDelta?: number;
  confidence?: number;
  conceptId?: string | null;
}

export interface SessionReport {
  sessionId: string;
  mode: SessionMode;
  score: number;
  accuracy: number;
  totalQuestions: number;
  correctCount: number;
  skippedCount: number;
  timeSpentMs: number;
  averageResponseMs: number | null;
  xpEarned: number;
  strongestConcepts: { conceptId: string; name?: string; correct: number; total: number }[];
  weakestConcepts: { conceptId: string; name?: string; correct: number; total: number }[];
  recommendedNextTopics: string[];
  improvementNote?: string;
}

export interface ReviewItem {
  questionId: string;
  stem: string;
  selectedKey: string | null;
  correctKey: string | null;
  explanation: string | null;
  conceptName?: string;
}

export interface NextSessionRecommendation {
  mode: SessionMode;
  title: string;
  reason: string;
  subjectIds?: string[];
  conceptIds?: string[];
  questionCount: number;
  priority: "critical" | "high" | "medium" | "low";
}

/** Candidate for weighted selection */
export interface ScoredQuestion {
  questionId: string;
  conceptId: string | null;
  subjectId: string;
  authorDifficulty: number;
  score: number; // higher = more likely to be selected
  reasons: string[];
}
