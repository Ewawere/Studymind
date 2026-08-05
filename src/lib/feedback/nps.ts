/**
 * Net Promoter Score collection.
 */

import { prisma } from "@/lib/prisma";
import type { NpsResponse } from "./types";

export async function submitNps(input: NpsResponse) {
  const score = Math.min(10, Math.max(0, Math.round(input.score)));

  const event = await prisma.learningEvent.create({
    data: {
      userId: input.userId,
      type: "nps",
      payload: {
        score,
        comment: input.comment?.trim().slice(0, 2000),
        cohort: input.cohort,
      },
    },
  });

  return { id: event.id, score };
}

export async function aggregateNps(opts?: { sinceDays?: number }) {
  const since = new Date();
  since.setDate(since.getDate() - (opts?.sinceDays ?? 90));

  const rows = await prisma.learningEvent.findMany({
    where: { type: "nps", createdAt: { gte: since } },
    select: { payload: true },
    take: 5000,
  });

  const scores = rows
    .map((r) => (r.payload as { score?: number })?.score)
    .filter((s): s is number => typeof s === "number");

  if (!scores.length) {
    return {
      responses: 0,
      nps: null as number | null,
      promoters: 0,
      passives: 0,
      detractors: 0,
    };
  }

  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const n = scores.length;
  const nps = Math.round(((promoters - detractors) / n) * 100);

  return { responses: n, nps, promoters, passives, detractors };
}
