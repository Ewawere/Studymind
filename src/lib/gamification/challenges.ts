/**
 * Rotating challenges by period.
 */

import { prisma } from "@/lib/prisma";
import type { ChallengeDef, UserChallengeView } from "./types";

export const CHALLENGE_CATALOG: ChallengeDef[] = [
  {
    code: "daily_questions_20",
    title: "Daily Drill",
    description: "Answer 20 questions today",
    period: "daily",
    target: 20,
    metric: "questions",
    xpReward: 40,
  },
  {
    code: "daily_minutes_30",
    title: "Half-Hour Focus",
    description: "Study for 30 minutes today",
    period: "daily",
    target: 30,
    metric: "minutes",
    xpReward: 35,
  },
  {
    code: "daily_revision_1",
    title: "Review Day",
    description: "Complete one revision session",
    period: "daily",
    target: 1,
    metric: "sessions",
    xpReward: 30,
  },
  {
    code: "weekly_sessions_3",
    title: "Weekly Consistency",
    description: "Complete 3 practice sessions this week",
    period: "weekly",
    target: 3,
    metric: "sessions",
    xpReward: 80,
  },
  {
    code: "weekly_reviews_all",
    title: "Clear the Queue",
    description: "Finish 10 due reviews this week",
    period: "weekly",
    target: 10,
    metric: "reviews",
    xpReward: 90,
  },
  {
    code: "monthly_mock",
    title: "Monthly Mock",
    description: "Complete one mock exam this month",
    period: "monthly",
    target: 1,
    metric: "sessions",
    xpReward: 120,
  },
  {
    code: "monthly_xp_2000",
    title: "XP Hunter",
    description: "Earn 2000 XP this month",
    period: "monthly",
    target: 2000,
    metric: "xp",
    xpReward: 100,
  },
];

function periodKey(period: string, d = new Date()): string {
  if (period === "daily") return d.toISOString().slice(0, 10);
  if (period === "weekly") {
    const tmp = new Date(d);
    const day = tmp.getDay();
    tmp.setDate(tmp.getDate() - day);
    return `W${tmp.toISOString().slice(0, 10)}`;
  }
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export async function generateDailyChallenges(
  userId: string
): Promise<UserChallengeView[]> {
  const views: UserChallengeView[] = [];

  for (const def of CHALLENGE_CATALOG) {
    const key = periodKey(def.period);
    const row = await prisma.userChallenge.upsert({
      where: {
        userId_code_periodKey: {
          userId,
          code: def.code,
          periodKey: key,
        },
      },
      create: {
        userId,
        code: def.code,
        period: def.period,
        periodKey: key,
        progress: 0,
        target: def.target,
      },
      update: {},
    });

    views.push({
      code: def.code,
      title: def.title,
      description: def.description,
      period: def.period,
      periodKey: key,
      progress: row.progress,
      target: row.target,
      completed: !!row.completedAt,
      claimed: !!row.claimedAt,
      xpReward: def.xpReward,
    });
  }

  return views;
}

export async function progressChallenge(
  userId: string,
  metric: ChallengeDef["metric"],
  delta: number
): Promise<string[]> {
  const completedCodes: string[] = [];
  const relevant = CHALLENGE_CATALOG.filter((c) => c.metric === metric);

  for (const def of relevant) {
    const key = periodKey(def.period);
    const row = await prisma.userChallenge.upsert({
      where: {
        userId_code_periodKey: { userId, code: def.code, periodKey: key },
      },
      create: {
        userId,
        code: def.code,
        period: def.period,
        periodKey: key,
        progress: Math.min(def.target, delta),
        target: def.target,
      },
      update: {
        progress: { increment: delta },
      },
    });

    const newProgress = Math.min(def.target, row.progress + (row.progress === 0 && delta ? 0 : 0));
    // re-read after update
    const fresh = await prisma.userChallenge.findUnique({
      where: {
        userId_code_periodKey: { userId, code: def.code, periodKey: key },
      },
    });
    if (!fresh) continue;

    if (!fresh.completedAt && fresh.progress >= fresh.target) {
      await prisma.userChallenge.update({
        where: { id: fresh.id },
        data: { completedAt: new Date(), progress: fresh.target },
      });
      completedCodes.push(def.code);
    }
  }

  return completedCodes;
}

export async function completeChallenge(
  userId: string,
  code: string
): Promise<UserChallengeView | null> {
  const def = CHALLENGE_CATALOG.find((c) => c.code === code);
  if (!def) return null;
  const key = periodKey(def.period);
  const row = await prisma.userChallenge.findUnique({
    where: {
      userId_code_periodKey: { userId, code, periodKey: key },
    },
  });
  if (!row) return null;

  if (!row.completedAt && row.progress >= row.target) {
    await prisma.userChallenge.update({
      where: { id: row.id },
      data: { completedAt: new Date() },
    });
  }

  const updated = await prisma.userChallenge.findUniqueOrThrow({
    where: { id: row.id },
  });

  return {
    code: def.code,
    title: def.title,
    description: def.description,
    period: def.period,
    periodKey: key,
    progress: updated.progress,
    target: updated.target,
    completed: !!updated.completedAt,
    claimed: !!updated.claimedAt,
    xpReward: def.xpReward,
  };
}
