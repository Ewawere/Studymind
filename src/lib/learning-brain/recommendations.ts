/**
 * Weak topic detection + prioritized recommendations
 * Supports concept-graph prerequisites.
 */

import type {
  Recommendation,
  WeakTopic,
  UserLearningContext,
  PriorityLevel,
  ConceptEdge,
} from "./types";
import { isDue, type SM2State } from "./sm2";
import { estimateRetention, needsProactiveReview } from "./forgetting";

export interface ConceptSnapshot {
  conceptId: string;
  conceptName?: string;
  topicId?: string;
  topicName?: string;
  subjectId?: string;
  subjectName?: string;
  masteryScore: number;
  confidence: number;
  attemptCount: number;
  correctCount: number;
  averageTimeMs?: number | null;
  estimatedTimeSec?: number | null;
  sm2: SM2State;
}

function toPriorityLevel(score: number): PriorityLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Detect and rank weak concepts, attaching missing prerequisites.
 */
export function detectWeakTopics(
  concepts: ConceptSnapshot[],
  edges: ConceptEdge[] = [],
  now: Date = new Date()
): WeakTopic[] {
  const byId = new Map(concepts.map((c) => [c.conceptId, c]));
  const weak: WeakTopic[] = [];

  for (const c of concepts) {
    const reasons: string[] = [];
    let priority = 0;

    if (c.masteryScore < 40) {
      reasons.push("low mastery");
      priority += (40 - c.masteryScore) * 1.5;
    } else if (c.masteryScore < 60) {
      reasons.push("below target mastery");
      priority += (60 - c.masteryScore) * 0.8;
    }

    // High mastery but low confidence → guessing
    if (c.masteryScore >= 70 && c.confidence < 45) {
      reasons.push("high mastery but low confidence");
      priority += 18;
    }

    if (c.attemptCount >= 3) {
      const accuracy = c.correctCount / c.attemptCount;
      if (accuracy < 0.5) {
        reasons.push("frequent incorrect answers");
        priority += (0.5 - accuracy) * 40;
      }
    }

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

    if (isDue(c.sm2, now) && c.sm2.repetitions > 0) {
      reasons.push("overdue for review");
      priority += 15;
    }

    if (c.sm2.easeFactor < 1.7 && c.sm2.repetitions > 0) {
      reasons.push("repeated forgetting");
      priority += 12;
    }

    const retention = estimateRetention(c.sm2, c.masteryScore, now);
    if (retention.currentRetention < 45 && c.sm2.repetitions > 0) {
      reasons.push("low retention");
      priority += 14;
    }

    // Missing prerequisites
    const prereqEdges = edges.filter(
      (e) =>
        e.toConceptId === c.conceptId && e.relationType === "prerequisite"
    );
    const missingPrerequisites = prereqEdges
      .map((e) => {
        const pre = byId.get(e.fromConceptId);
        if (!pre || pre.masteryScore >= 55) return null;
        return {
          conceptId: e.fromConceptId,
          name: pre.conceptName ?? e.fromName,
          masteryScore: pre.masteryScore,
        };
      })
      .filter(Boolean) as WeakTopic["missingPrerequisites"];

    if (missingPrerequisites && missingPrerequisites.length > 0) {
      reasons.push("missing prerequisites");
      priority += 20;
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
        confidence: c.confidence,
        priority: Math.round(priority),
        reasons,
        missingPrerequisites,
      });
    }
  }

  return weak.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate prioritized recommendations (Critical → Low).
 */
export function recommendNextTopics(
  concepts: ConceptSnapshot[],
  ctx: UserLearningContext,
  edges: ConceptEdge[] = [],
  now: Date = new Date()
): Recommendation[] {
  const recs: Recommendation[] = [];
  const weak = detectWeakTopics(concepts, edges, now);

  // Exam urgency multiplier
  let examBoost = 0;
  if (ctx.targetExamDate) {
    const daysLeft =
      (ctx.targetExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 0 && daysLeft <= 7) examBoost = 25;
    else if (daysLeft <= 21) examBoost = 12;
  }

  // Prerequisites first (for weak concepts that need them)
  for (const w of weak) {
    if (!w.missingPrerequisites?.length) continue;
    for (const pre of w.missingPrerequisites.slice(0, 2)) {
      const score = 88 + examBoost;
      recs.push({
        type: "prerequisite",
        priorityLevel: toPriorityLevel(score),
        conceptId: pre.conceptId,
        title: pre.name
          ? `Review prerequisite: ${pre.name}`
          : "Review prerequisite concept",
        reason: w.conceptName
          ? `Needed before ${w.conceptName} (mastery ${Math.round(pre.masteryScore)}%)`
          : "Prerequisite for a weak concept",
        priority: score,
        estimatedMinutes: 15,
      });
    }
  }

  // Due reviews
  const due = concepts
    .filter((c) => isDue(c.sm2, now) && c.sm2.repetitions > 0)
    .sort((a, b) => {
      const aTime = a.sm2.nextReviewAt?.getTime() ?? 0;
      const bTime = b.sm2.nextReviewAt?.getTime() ?? 0;
      return aTime - bTime;
    });

  for (const c of due.slice(0, 5)) {
    const score = 90 + examBoost;
    recs.push({
      type: "review_today",
      priorityLevel: toPriorityLevel(score),
      conceptId: c.conceptId,
      topicId: c.topicId,
      subjectId: c.subjectId,
      title: c.conceptName ? `Review: ${c.conceptName}` : "Review due concept",
      reason: "Spaced repetition schedule",
      priority: score,
      estimatedMinutes: 10,
    });
  }

  // Proactive reviews (forgetting curve)
  for (const c of concepts) {
    if (needsProactiveReview(c.sm2, c.masteryScore, now)) {
      const score = 75 + examBoost;
      recs.push({
        type: "review_today",
        priorityLevel: toPriorityLevel(score),
        conceptId: c.conceptId,
        topicId: c.topicId,
        subjectId: c.subjectId,
        title: c.conceptName
          ? `Refresh before you forget: ${c.conceptName}`
          : "Refresh fading knowledge",
        reason: "Retention dropping below 50% within 24h",
        priority: score,
        estimatedMinutes: 8,
      });
    }
  }

  // Weak focus
  for (const w of weak.slice(0, 4)) {
    const score = 70 + Math.min(w.priority, 20) + examBoost;
    recs.push({
      type: "weak_focus",
      priorityLevel: toPriorityLevel(score),
      conceptId: w.conceptId,
      topicId: w.topicId,
      subjectId: w.subjectId,
      title: w.conceptName
        ? `Strengthen: ${w.conceptName}`
        : "Strengthen weak concept",
      reason: w.reasons.join(", "),
      priority: score,
      estimatedMinutes: 15,
    });
  }

  // Unexplored
  for (const c of concepts
    .filter((x) => x.attemptCount === 0 && x.masteryScore === 0)
    .slice(0, 3)) {
    recs.push({
      type: "study_next",
      priorityLevel: "medium",
      conceptId: c.conceptId,
      topicId: c.topicId,
      subjectId: c.subjectId,
      title: c.conceptName ? `Learn: ${c.conceptName}` : "New concept",
      reason: "Not yet studied",
      priority: 50,
      estimatedMinutes: 20,
    });
  }

  if (ctx.targetExamDate) {
    const daysLeft =
      (ctx.targetExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 0 && daysLeft <= 21) {
      const score = 95;
      recs.push({
        type: "revise_before_exam",
        priorityLevel: "critical",
        title: "Exam revision block",
        reason: `Exam in ${Math.ceil(daysLeft)} days`,
        priority: score,
        estimatedMinutes: Math.min(ctx.dailyStudyTargetMin, 45),
      });
    }
  }

  if (concepts.filter((c) => c.attemptCount > 0).length >= 5) {
    recs.push({
      type: "practice_mixed",
      priorityLevel: "low",
      title: "Mixed practice quiz",
      reason: "Reinforce multiple topics",
      priority: 40,
      estimatedMinutes: 15,
    });
  }

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
