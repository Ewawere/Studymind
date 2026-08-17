/**
 * Personalized recommendations combining Learning Brain + analytics.
 */

import { getRecommendations as brainRecs } from "@/lib/learning-brain";
import { recommendNextSession } from "@/lib/practice-engine";
import { getPrediction } from "./predictions";
import type { AnalyticsRecommendation } from "./types";

function toPriority(
  value: unknown
): AnalyticsRecommendation["priority"] {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  if (typeof value === "number") {
    if (value >= 4) return "critical";
    if (value >= 3) return "high";
    if (value >= 2) return "medium";
    return "low";
  }
  return "medium";
}

export async function getAnalyticsRecommendations(
  userId: string
): Promise<AnalyticsRecommendation[]> {
  const [brain, sessions, prediction] = await Promise.all([
    brainRecs(userId).catch(() => []),
    recommendNextSession(userId).catch(() => []),
    getPrediction(userId),
  ]);

  const out: AnalyticsRecommendation[] = [];

  for (const r of brain.slice(0, 5)) {
    out.push({
      id: `brain-${r.type}-${r.conceptId ?? r.subjectId ?? r.title}`,
      kind:
        r.type === "review_today"
          ? "revision"
          : r.type === "weak_focus"
            ? "concept"
            : "topic",
      title: r.title,
      reason: r.reason,
      priority: toPriority(r.priority),
      meta: {
        conceptId: r.conceptId,
        subjectId: r.subjectId,
      },
    });
  }

  for (const s of sessions.slice(0, 4)) {
    out.push({
      id: `session-${s.mode}-${s.title}`,
      kind:
        s.mode === "exam" || s.mode === "challenge"
          ? "mock_exam"
          : s.mode === "revision"
            ? "revision"
            : "practice",
      title: s.title,
      reason: s.reason,
      priority: toPriority(s.priority),
      meta: {
        mode: s.mode,
        questionCount: s.questionCount,
        conceptIds: s.conceptIds,
        subjectIds: s.subjectIds,
      },
    });
  }

  if (prediction.readinessScore >= 65 && prediction.passProbability >= 0.55) {
    out.push({
      id: "mock-ready",
      kind: "mock_exam",
      title: "Take a timed mock exam",
      reason: `Readiness ~${prediction.readinessScore}% — validate under exam conditions`,
      priority: "high",
    });
  }

  if (prediction.weakestFutureTopics.length) {
    out.push({
      id: "tutor-weak",
      kind: "tutor",
      title: `AI Tutor: ${prediction.weakestFutureTopics[0]}`,
      reason: "Get a personalized explanation for your weakest topic",
      priority: "medium",
      meta: { topic: prediction.weakestFutureTopics[0] },
    });
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return out.filter((r) => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });
}
