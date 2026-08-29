/**
 * Daily study plan generator
 *
 * Builds a time-boxed plan that respects the user's daily target
 * and prioritises due reviews + weak topics.
 */

import type {
  DailyPlan,
  PlanItem,
  UserLearningContext,
  Recommendation,
  ConceptEdge,
} from "./types";
import { recommendNextTopics, type ConceptSnapshot } from "./recommendations";

/**
 * Generate a personalized daily study plan.
 */
export function generateDailyPlan(
  concepts: ConceptSnapshot[],
  ctx: UserLearningContext,
  now: Date = new Date(),
  edges: ConceptEdge[] = []
): DailyPlan {
  const target = Math.max(15, ctx.dailyStudyTargetMin || 45);
  const recommendations = recommendNextTopics(concepts, ctx, edges, now);

  const items: PlanItem[] = [];
  let used = 0;
  let order = 0;

  for (const rec of recommendations) {
    if (used >= target) break;

    const duration = Math.min(rec.estimatedMinutes, target - used);
    if (duration < 5) continue;

    items.push(recommendationToPlanItem(rec, duration, order++));
    used += duration;
  }

  // If we still have room, add a short mixed practice block
  if (used + 10 <= target && items.length > 0) {
    items.push({
      type: "mixed",
      title: "Quick mixed practice",
      description: "5–10 mixed questions from recent topics",
      durationMin: Math.min(15, target - used),
      order: order++,
    });
    used += Math.min(15, target - used);
  }

  // Empty plan fallback
  if (items.length === 0) {
    items.push({
      type: "practice",
      title: "Start with a practice quiz",
      description: "Build your Learning Brain with a short quiz",
      durationMin: Math.min(20, target),
      order: 0,
    });
    used = Math.min(20, target);
  }

  return {
    date: startOfDay(now),
    totalMinutes: used,
    targetMinutes: target,
    items,
    generatedBy: "learning_brain",
  };
}

function recommendationToPlanItem(
  rec: Recommendation,
  durationMin: number,
  order: number
): PlanItem {
  const typeMap: Record<Recommendation["type"], PlanItem["type"]> = {
    review_today: "review",
    weak_focus: "practice",
    study_next: "tutor",
    revise_before_exam: "review",
    practice_mixed: "mixed",
    prerequisite: "review",
  };

  return {
    type: typeMap[rec.type] ?? "practice",
    title: rec.title,
    description: rec.reason,
    subjectId: rec.subjectId,
    topicId: rec.topicId,
    conceptId: rec.conceptId,
    durationMin,
    order,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
