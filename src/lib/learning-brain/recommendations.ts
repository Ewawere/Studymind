/**
 * Weak topic detection + next-study recommendations
 * Pure ranking logic. Callers supply the data.
 */

import type {
  Recommendation,
  WeakTopic,
  UserLearningContext,
} from "./types";
import { isDue, type SM2State } from "./sm2";

export interface ConceptSnapshot {
  conceptId: string;
  conceptName?: string;
  topicId?: string;
  topicName?: string;
  subjectId?: string;
  subjectName?: string;
  masteryScore: number;
  attemptCount: number;
  correctCount: number;
  averageTimeMs?: number | null;
  estimatedTimeSec?: number | null;
  sm2: SM2State;
}

/**
 * Detect and rank weak concepts.
 */
export function detectWeakTopics(
  concepts: ConceptSnapshot[],
  now: Date = new Date()
): WeakTopic[] {
  const weak: WeakTopic[] = [];

  for (const c of concepts) {
    const reasons: string[] = [];
    let priority = 0;

    // Low mastery
    if (c.masteryScore < 40) {
      reasons.push("low mastery");
      priority += (40 - c.masteryScore) * 1.5;
    } else if (c.masteryScore < 60) {
      reasons.push("below target mastery");
      priority += (60 - c.masteryScore) * 0.8;
    }

    // High error rate
    if (c.attemptCount >= 3) {
      const accuracy = c.correctCount / c.attemptCount;
      if (accuracy < 0.5) {
        reasons.push("frequent incorrect answers");
        priority += (0.5 - accuracy) * 40;
      }
    }

    // Slow responses relative to estimate
    if (
      c.averageTimeMs &&
      c.estimatedTimeSec &&
      c.estimatedTimeSec > 0 &&
      c.attemptCount >= 2
    ) {
      const ratio = c.averageTimeMs / (c.estimatedTimeSec * 1000);
      if (ratio > 1.8) {
        reasons.push("unusually slow responses");
        priority += 10;
      }
    }

    // Overdue spaced-repetition item
    if (isDue(c.sm2, now) && c.sm2.repetitions > 0) {
      reasons.push("overdue for review");
      priority += 15;
    }

    // Failed recent SM-2 (low ease)
    if (c.sm2.easeFactor < 1.7 && c.sm2.repetitions > 0) {
      reasons.push("repeated forgetting");
      priority += 12;
    }

    if (reasons.length > 0 && priority > 5) {
      weak.push({
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        topicId: c.topicId,
        topicName: c.topicName,
        subjectId: c.subjectId,
        subjectName: c.subjectName,
        masteryScore: c.masteryScore,
        priority: Math.round(priority),
        reasons,
      });
    }
  }

  return weak.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate prioritized study recommendations.
 */
export function recommendNextTopics(
  concepts: ConceptSnapshot[],
  ctx: UserLearningContext,
  now: Date = new Date()
): Recommendation[] {
  const recs: Recommendation[] = [];
  const weak = detectWeakTopics(concepts, now);

  // 1. Due reviews (spaced repetition)
  const due = concepts
    .filter((c) => isDue(c.sm2, now) && c.sm2.repetitions > 0)
    .sort((a, b) => {
      const aTime = a.sm2.nextReviewAt?.getTime() ?? 0;
      const bTime = b.sm2.nextReviewAt?.getTime() ?? 0;
      return aTime - bTime;
    });

  for (const c of due.slice(0, 5)) {
    recs.push({
      type: "review_today",
      conceptId: c.conceptId,
      topicId: c.topicId,
      subjectId: c.subjectId,
      title: c.conceptName
        ? `Review: ${c.conceptName}`
        : "Review due concept",
      reason: "Spaced repetition schedule",
      priority: 90,
      estimatedMinutes: 10,
    });
  }

  // 2. Weak focus
  for (const w of weak.slice(0, 4)) {
    recs.push({
      type: "weak_focus",
      conceptId: w.conceptId,
      topicId: w.topicId,
      subjectId: w.subjectId,
      title: w.conceptName
        ? `Strengthen: ${w.conceptName}`
        : "Strengthen weak concept",
      reason: w.reasons.join(", "),
      priority: 70 + Math.min(w.priority, 20),
      estimatedMinutes: 15,
    });
  }

  // 3. New / unexplored concepts (mastery 0, never attempted)
  const unexplored = concepts
    .filter((c) => c.attemptCount === 0 && c.masteryScore === 0)
    .slice(0, 3);

  for (const c of unexplored) {
    recs.push({
      type: "study_next",
      conceptId: c.conceptId,
      topicId: c.topicId,
      subjectId: c.subjectId,
      title: c.conceptName ? `Learn: ${c.conceptName}` : "New concept",
      reason: "Not yet studied",
      priority: 50,
      estimatedMinutes: 20,
    });
  }

  // 4. Exam pressure boost
  if (ctx.targetExamDate) {
    const daysLeft =
      (ctx.targetExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 0 && daysLeft <= 21) {
      recs.push({
        type: "revise_before_exam",
        title: "Exam revision block",
        reason: `Exam in ${Math.ceil(daysLeft)} days`,
        priority: 95,
        estimatedMinutes: Math.min(ctx.dailyStudyTargetMin, 45),
      });
    }
  }

  // 5. Mixed practice suggestion
  if (concepts.filter((c) => c.attemptCount > 0).length >= 5) {
    recs.push({
      type: "practice_mixed",
      title: "Mixed practice quiz",
      reason: "Reinforce multiple topics",
      priority: 40,
      estimatedMinutes: 15,
    });
  }

  // Sort by priority descending, dedupe by conceptId where present
  const seen = new Set<string>();
  const unique: Recommendation[] = [];
  for (const r of recs.sort((a, b) => b.priority - a.priority)) {
    const key = r.conceptId ?? r.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  return unique;
}
