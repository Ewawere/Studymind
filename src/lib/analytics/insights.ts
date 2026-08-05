/**
 * Natural-language insight summaries from analytics signals.
 */

import { generateLearningInsights } from "@/lib/learning-brain";
import { getPerformanceReport } from "./performance";
import { getPrediction } from "./predictions";
import type { InsightSummary } from "./types";

export async function generateInsightSummary(
  userId: string
): Promise<InsightSummary> {
  const [brain, performance, prediction] = await Promise.all([
    generateLearningInsights(userId).catch(() => null),
    getPerformanceReport(userId),
    getPrediction(userId),
  ]);

  const headlines: string[] = [];
  const details: string[] = [];

  if (brain?.narratives?.length) {
    headlines.push(...brain.narratives.slice(0, 3));
  }

  if (performance.improvementRate != null) {
    const pct = Math.round(performance.improvementRate * 100);
    if (pct > 0) {
      headlines.push(`Your accuracy improved by about ${pct}% versus last week.`);
    } else if (pct < 0) {
      headlines.push(`Accuracy dipped about ${Math.abs(pct)}% versus last week.`);
    }
  }

  const weakSubjects = performance.bySubject
    .filter((s) => s.attempted >= 5)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 2);
  for (const s of weakSubjects) {
    if (s.accuracy < 60) {
      details.push(
        `You consistently struggle with ${s.label} (${s.accuracy}% accuracy).`
      );
    }
  }

  const slow = performance.byConcept
    .filter((c) => c.attempted >= 3 && c.averageMs && c.averageMs > 45000)
    .slice(0, 2);
  for (const c of slow) {
    details.push(
      `You often take longer than average on ${c.label} — consider timed drills.`
    );
  }

  if (prediction.readinessScore >= 70) {
    headlines.push("You're likely ready for a full mock exam.");
  } else if (prediction.readinessScore < 45) {
    headlines.push("Focus on weak concepts before attempting a full mock.");
  }

  for (const n of prediction.notes) details.push(n);

  if (headlines.length === 0) {
    headlines.push("Keep practicing — insights unlock after more activity.");
  }

  return {
    headlines: headlines.slice(0, 5),
    details: details.slice(0, 8),
    generatedAt: new Date().toISOString(),
  };
}
