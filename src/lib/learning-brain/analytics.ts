/**
 * Exam readiness + learning insights
 * Pure aggregation over provided snapshots.
 */

import type {
  ExamReadiness,
  LearningInsights,
  PerformanceTrends,
  PeriodStats,
  UserLearningContext,
} from "./types";
import type { ConceptSnapshot } from "./recommendations";
import { isDue } from "./sm2";

export interface SubjectRollup {
  subjectId: string;
  name?: string;
  mastery: number;
  attempted: number;
  correct: number;
}

export interface AnalyticsInput {
  concepts: ConceptSnapshot[];
  subjects: SubjectRollup[];
  currentStreak: number;
  longestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  averageResponseMs?: number | null;
  // Optional: last N mastery snapshots for trend (most recent last)
  recentMasteryAverages?: number[];
  ctx: UserLearningContext;
  now?: Date;
}

/**
 * Calculate overall exam readiness (0–100) with confidence.
 */
export function calculateExamReadiness(input: AnalyticsInput): ExamReadiness {
  const now = input.now ?? new Date();
  const { concepts, subjects, totalAttempted, totalCorrect, currentStreak, ctx } =
    input;

  // 1. Mastery average (weight concepts with attempts more)
  let masterySum = 0;
  let masteryWeight = 0;
  for (const c of concepts) {
    const w = 1 + c.attemptCount * 0.15;
    masterySum += c.masteryScore * w;
    masteryWeight += w;
  }
  const masteryAverage =
    masteryWeight > 0 ? masterySum / masteryWeight : 0;

  // 2. Accuracy
  const accuracy =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  // 3. Consistency (streak proxy, capped)
  const consistency = Math.min(currentStreak * 8, 100);

  // 4. Syllabus coverage — % of concepts with at least 1 attempt
  const coverage =
    concepts.length > 0
      ? (concepts.filter((c) => c.attemptCount > 0).length / concepts.length) *
        100
      : 0;

  // 5. Spaced-rep completion — % of scheduled items that are not overdue
  const scheduled = concepts.filter((c) => c.sm2.repetitions > 0);
  const onTrack = scheduled.filter((c) => !isDue(c.sm2, now));
  const spacedRepCompletion =
    scheduled.length > 0 ? (onTrack.length / scheduled.length) * 100 : 50;

  // Weighted composite
  const score = clamp(
    masteryAverage * 0.35 +
      accuracy * 0.25 +
      coverage * 0.2 +
      spacedRepCompletion * 0.1 +
      consistency * 0.1,
    0,
    100
  );

  // Confidence based on sample size + coverage
  let confidence: ExamReadiness["confidence"] = "low";
  if (totalAttempted >= 50 && coverage >= 40) confidence = "medium";
  if (totalAttempted >= 120 && coverage >= 60) confidence = "high";

  // Exam-date urgency message
  let message = readinessMessage(score, confidence);
  if (ctx.targetExamDate) {
    const days =
      (ctx.targetExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days <= 14 && score < 70) {
      message += ` Exam in ${Math.ceil(days)} days — prioritise weak topics.`;
    }
  }

  return {
    score: Math.round(score),
    confidence,
    breakdown: {
      masteryAverage: Math.round(masteryAverage),
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      coverage: Math.round(coverage),
      spacedRepCompletion: Math.round(spacedRepCompletion),
    },
    message,
  };
}

function emptyPeriod(days: 7 | 30 | 90): PeriodStats {
  return {
    days,
    attempted: 0,
    correct: 0,
    accuracy: 0,
    averageMastery: null,
    studyMinutes: 0,
  };
}

/**
 * Aggregate learning insights for dashboards / AI Coach.
 */
export function generateLearningInsights(
  input: AnalyticsInput
): LearningInsights {
  const {
    subjects,
    totalAttempted,
    totalCorrect,
    averageResponseMs,
    currentStreak,
    longestStreak,
    recentMasteryAverages,
  } = input;

  const totalIncorrect = Math.max(0, totalAttempted - totalCorrect);
  const accuracy =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  const sorted = [...subjects].sort((a, b) => b.mastery - a.mastery);
  const strongestSubjects = sorted.slice(0, 3).map((s) => ({
    subjectId: s.subjectId,
    name: s.name,
    mastery: Math.round(s.mastery),
  }));
  const weakestSubjects = sorted
    .slice()
    .reverse()
    .slice(0, 3)
    .map((s) => ({
      subjectId: s.subjectId,
      name: s.name,
      mastery: Math.round(s.mastery),
    }));

  // Simple trend from recent averages
  let masteryTrend: LearningInsights["masteryTrend"] = "unknown";
  if (recentMasteryAverages && recentMasteryAverages.length >= 3) {
    const first = recentMasteryAverages[0];
    const last = recentMasteryAverages[recentMasteryAverages.length - 1];
    const diff = last - first;
    if (diff > 3) masteryTrend = "improving";
    else if (diff < -3) masteryTrend = "declining";
    else masteryTrend = "stable";
  }

  const readiness = calculateExamReadiness(input);

  const narratives: string[] = [];
  if (totalAttempted === 0) {
    narratives.push("Start practicing to unlock personalized insights.");
  } else {
    narratives.push(
      `Overall accuracy is ${Math.round(accuracy)}% across ${totalAttempted} attempts.`
    );
    if (weakestSubjects[0]) {
      narratives.push(
        `Focus next on ${weakestSubjects[0].name ?? "your weakest subject"} (mastery ${weakestSubjects[0].mastery}%).`
      );
    }
    if (currentStreak > 0) {
      narratives.push(`Current study streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"}.`);
    }
    if (readiness.score >= 0) {
      narratives.push(readiness.message);
    }
  }

  const trends: PerformanceTrends = {
    last7Days: emptyPeriod(7),
    last30Days: emptyPeriod(30),
    last90Days: emptyPeriod(90),
    direction: masteryTrend === "unknown" ? "unknown" : masteryTrend,
  };

  return {
    totalAttempted,
    totalCorrect,
    totalIncorrect,
    accuracy: Math.round(accuracy * 10) / 10,
    averageResponseMs: averageResponseMs ?? null,
    strongestSubjects,
    weakestSubjects,
    currentStreak,
    longestStreak,
    estimatedExamScore: readiness.score,
    masteryTrend,
    narratives,
    trends,
  };
}

function readinessMessage(
  score: number,
  confidence: ExamReadiness["confidence"]
): string {
  if (score >= 80)
    return `Strong readiness (${confidence} confidence). Keep reviewing due cards.`;
  if (score >= 60)
    return `Solid progress (${confidence} confidence). Focus on weak topics to push higher.`;
  if (score >= 40)
    return `Building foundation (${confidence} confidence). Prioritise weak concepts daily.`;
  return `Early stage (${confidence} confidence). Consistency matters more than intensity right now.`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
