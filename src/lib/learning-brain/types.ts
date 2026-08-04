/**
 * StudyMind Learning Brain — shared types
 * Curriculum-agnostic. Works for WAEC, JAMB, NECO, Cambridge, SAT, etc.
 */

// ── SM-2 ──

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
}

export interface SM2UpdateResult extends SM2State {
  quality: SM2Quality;
}

// ── Forgetting / retention ──

export interface RetentionEstimate {
  currentRetention: number; // 0–100 %
  retentionTomorrow: number; // 0–100 %
  estimatedForgetDate: Date | null; // when retention drops below ~40%
}

// ── Mastery + Confidence ──

export interface MasteryInput {
  previousMastery: number;
  previousConfidence?: number;
  isCorrect: boolean;
  difficulty: number;
  timeSpentMs?: number | null;
  estimatedTimeSec?: number | null;
  attemptCount?: number;
  recentResults?: string; // e.g. "10110"
}

export interface MasteryResult {
  masteryScore: number;
  confidence: number;
  delta: number;
  confidenceDelta: number;
  recentResults: string;
}

// ── Attempts ──

export interface QuestionAttemptInput {
  userId: string;
  questionId: string;
  conceptId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  isCorrect: boolean;
  difficulty: number;
  timeSpentMs?: number | null;
  estimatedTimeSec?: number | null;
  selectedKey?: string | null;
  quizAttemptId?: string | null;
}

// ── Concept graph ──

export type ConceptRelationType = "prerequisite" | "related" | "part_of";

export interface ConceptEdge {
  fromConceptId: string;
  toConceptId: string;
  relationType: ConceptRelationType;
  strength: number;
  fromName?: string;
  toName?: string;
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
  confidence: number;
  priority: number;
  reasons: string[];
  /** Prerequisite concepts the user should review first */
  missingPrerequisites?: {
    conceptId: string;
    name?: string;
    masteryScore: number;
  }[];
}

// ── Recommendations ──

export type RecommendationType =
  | "study_next"
  | "review_today"
  | "practice_mixed"
  | "revise_before_exam"
  | "weak_focus"
  | "prerequisite";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  type: RecommendationType;
  priorityLevel: PriorityLevel;
  conceptId?: string;
  topicId?: string;
  subjectId?: string;
  title: string;
  reason: string;
  priority: number; // numeric for sorting
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
  priorityLevel?: PriorityLevel;
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
  score: number;
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

// ── Trends ──

export interface PeriodStats {
  days: 7 | 30 | 90;
  attempted: number;
  correct: number;
  accuracy: number;
  averageMastery: number | null;
  studyMinutes: number;
}

export interface PerformanceTrends {
  last7Days: PeriodStats;
  last30Days: PeriodStats;
  last90Days: PeriodStats;
  direction: "improving" | "stable" | "declining" | "unknown";
}

// ── Insights ──

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
  /** Natural-language insights for dashboard / AI Coach */
  narratives: string[];
  trends: PerformanceTrends;
}

// ── User context ──

export interface UserLearningContext {
  userId: string;
  dailyStudyTargetMin: number;
  targetExamDate?: Date | null;
  weakSubjects: string[];
  primaryFocus?: string | null;
  curriculumId?: string | null;
  learningGoals?: string[];
  preferredExplanationStyle?: string | null;
}

// ── AI Tutor context bundle ──

export interface AITutorContext {
  userId: string;
  preferredExplanationStyle: string | null;
  learningGoals: string[];
  dailyStudyTargetMin: number;
  examDate: Date | null;
  examReadiness: ExamReadiness;
  currentStreak: number;
  weakConcepts: WeakTopic[];
  strongConcepts: {
    conceptId: string;
    name?: string;
    masteryScore: number;
    confidence: number;
  }[];
  topicMastery: {
    conceptId: string;
    name?: string;
    masteryScore: number;
    confidence: number;
    retention: RetentionEstimate;
  }[];
  upcomingReviews: {
    conceptId: string;
    name?: string;
    nextReviewAt: Date;
    retention: RetentionEstimate;
  }[];
  recentMistakes: {
    questionId: string;
    conceptId?: string | null;
    conceptName?: string;
    createdAt: Date;
  }[];
  currentPlan: DailyPlan | null;
  narratives: string[];
  primaryFocus: string | null;
}
