/**
 * Generic survey responses (onboarding, beta exit, feature discovery, etc.).
 */

import { prisma } from "@/lib/prisma";
import type { SurveyResponse } from "./types";

export async function submitSurvey(input: SurveyResponse) {
  if (!input.userId) throw new Error("userId is required");
  if (!input.surveyId?.trim()) throw new Error("surveyId is required");

  const event = await prisma.learningEvent.create({
    data: {
      userId: input.userId,
      type: "survey_response",
      payload: {
        surveyId: input.surveyId.trim(),
        answers: input.answers,
      },
    },
  });

  return { id: event.id };
}

export async function listSurveyResponses(
  surveyId: string,
  limit = 200
) {
  const rows = await prisma.learningEvent.findMany({
    where: { type: "survey_response" },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });

  return rows
    .map((r) => {
      const p = (r.payload ?? {}) as {
        surveyId?: string;
        answers?: Record<string, unknown>;
      };
      return {
        id: r.id,
        userId: r.userId,
        surveyId: p.surveyId,
        answers: p.answers ?? {},
        createdAt: r.createdAt.toISOString(),
      };
    })
    .filter((r) => r.surveyId === surveyId)
    .slice(0, limit);
}
