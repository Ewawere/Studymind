/**
 * StudyMind Analytics & Insights types
 */

export interface StudentDashboard {
  userId: string;
  overallMastery: number;
  overallConfidence: number;
  examReadiness: number | null;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  playerLevel: number;
  totalStudyMinutes: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  averageResponseMs: number | null;
  subjectMasteries: {
    subjectId: string;
    name: string;
    mastery: number;
    confidence: number;
    attempted: number;
    correct: number;
  }[];
  weakConcepts: {
    conceptId: string;
    name?: string;
    mastery: number;
    confidence: number;
  }[];
  strongConcepts: {
    conceptId: string;
    name?: string;
    mastery: number;
  }[];
  weeklyActivity: { date: string; questions: number; minutes: number }[];
  upcomingReviews: number;
  recommendedNext: {
    type: string;
    title: string;
    reason: string;
    priority: string;
  }[];
  narratives: string[];
}

export interface ProgressPoint {
  date: string;
  mastery: number;
  confidence: number;
  questions: number;
  correct: number;
}

export interface MasteryHeatmapCell {
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  mastery: number;
  confidence: number;
  attempted: number;
}

export interface PerformanceSlice {
  key: string;
  label: string;
  attempted: number;
  correct: number;
  accuracy: number;
  averageMs: number | null;
}

export interface PerformanceReport {
  bySubject: PerformanceSlice[];
  byTopic: PerformanceSlice[];
  byConcept: PerformanceSlice[];
  byDifficulty: PerformanceSlice[];
  skipRate: number;
  guessHeuristic: number | null;
  practiceSessions: number;
  examSessions: number;
  improvementRate: number | null;
}

export interface Prediction {
  expectedExamScore: number;
  passProbability: number;
  readinessScore: number;
  weakestFutureTopics: string[];
  estimatedMasteryDays: number | null;
  recommendedStudyHoursPerWeek: number;
  confidence: number;
  notes: string[];
}

export interface AnalyticsRecommendation {
  id: string;
  kind:
    | "topic"
    | "concept"
    | "revision"
    | "practice"
    | "mock_exam"
    | "tutor"
    | "flashcards"
    | "plan_adjust";
  title: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  meta?: Record<string, unknown>;
}

export interface InsightSummary {
  headlines: string[];
  details: string[];
  generatedAt: string;
}

export interface ExportReport {
  type: "student" | "parent" | "teacher" | "admin" | "practice" | "exam" | "progress";
  title: string;
  generatedAt: string;
  sections: { heading: string; body: string; rows?: Record<string, string | number>[] }[];
  csv?: string;
}
