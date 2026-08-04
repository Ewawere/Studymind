/**
 * StudyMind Learning Brain — shared types
 *
 * Curriculum-agnostic. Works for WAEC, JAMB, NECO, Cambridge, SAT, etc.
 */

// ── SM-2 ──

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2State {
  easeFactor: number; // typically 1.3 – 2.5+
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
}

export interface SM2UpdateResult extends SM2State {
  quality: SM2Quality;
}

// ── Mastery ──

export interface MasteryInput {
  previousMastery: number; // 0–100
  isCorrect: boolean;
  difficulty: number; // 1–5
  timeSpentMs?: number | null;
  estimatedTimeSec?: number | null;
  attemptCount?: number; // prior attempts on this concept
}

export interface MasteryResult {
  masteryScore: number; // 0–100
  delta: number;
}

// ── Attempts ──

export interface QuestionAttemptInput {
  userId: string;
  questionId: string;
  conceptId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  isCorrect: boolean;
  difficulty: number; // 1–5
  timeSpentMs?: number | null;
  estimatedTimeSec?: number | null;
  selectedKey?: string | null;
  quizAttemptId?: string | null;
}

// ── Weak topics ──

export interface WeakTopic {
  conceptId: string;
  conceptName?: string;
  topicId?: string;
  topicName?: string;
  subjectId?: string;
  subjectName?: string;
  masteryScore: number;
  priority: number; // higher = more urgent
  reasons: string[];
}

// ── Recommendations ──

export type RecommendationType =
  | "study_next"
  | "review_today"
  | "practice_mixed"
  | "revise_before_exam"
  | "weak_focus";

export interface Recommendation {
  type: RecommendationType;
  conceptId?: string;
  topicId?: string;
  subjectId?: string;
  title: string;
  reason: string;
  priority: number;
  estimatedMinutes: number;
}

// ── Daily plan ──

export type PlanItemType =
  | "review"
  | "practice"
  | "quiz"
  | "tutor"
  | "flashcards"
  | "mixed";

export interface PlanItem {
  type: PlanItemType;
  title: string;
  description?: string;
  subjectId?: string;
  topicId?: string;
  conceptId?: string;
  durationMin: number;
  order: number;
}

export interface DailyPlan {
  date: Date;
  totalMinutes: number;
  targetMinutes: number;
  items: PlanItem[];
  generatedBy: "learning_brain";
}

// ── Exam readiness ──

export interface ExamReadiness {
  score: number; // 0–100
  confidence: "low" | "medium" | "high";
  breakdown: {
    masteryAverage: number;
    accuracy: number;
    consistency: number;
    coverage: number;
    spacedRepCompletion: number;
  };
  message: string;
}

// ── Analytics / insights ──

export interface LearningInsights {
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
  averageResponseMs: number | null;
  strongestSubjects: { subjectId: string; name?: string; mastery: number }[];
  weakestSubjects: { subjectId: string; name?: string; mastery: number }[];
  currentStreak: number;
  longestStreak: number;
  estimatedExamScore: number | null;
  masteryTrend: "improving" | "stable" | "declining" | "unknown";
}

// ── User context for planning ──

export interface UserLearningContext {
  userId: string;
  dailyStudyTargetMin: number;
  targetExamDate?: Date | null;
  weakSubjects: string[];
  primaryFocus?: string | null;
  curriculumId?: string | null;
}
