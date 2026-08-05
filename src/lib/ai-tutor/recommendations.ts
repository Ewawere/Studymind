/**
 * Merge AI suggestions with Learning Brain recommendations.
 */

import { getRecommendations } from "@/lib/learning-brain";
import type { TutorStructuredResponse, TutorContext } from "./types";

export async function enrichWithBrainRecommendations(
  userId: string,
  response: TutorStructuredResponse,
  ctx: TutorContext
): Promise<TutorStructuredResponse> {
  try {
    const brain = await getRecommendations(userId);
    const top = brain[0];

    if (!response.recommendedPractice && top) {
      response.recommendedPractice = `${top.title}: ${top.reason}`;
      if (!response.nextActions.includes("practice")) {
        response.nextActions.push("practice");
      }
    }

    const review = brain.find((r) => r.type === "review_today");
    if (!response.recommendedRevision && review) {
      response.recommendedRevision = `${review.title}: ${review.reason}`;
      if (!response.nextActions.includes("revise")) {
        response.nextActions.push("revise");
      }
    }

    if (
      response.suggestedDifficulty == null &&
      ctx.weakConcepts[0] &&
      ctx.weakConcepts[0].mastery < 40
    ) {
      response.suggestedDifficulty = 2; // ease in
    }
  } catch {
    // non-fatal
  }

  return response;
}
