/**
 * XP rules — reward learning, not farming.
 */

import { prisma } from "@/lib/prisma";
import { publish, invalidate, cacheKey } from "@/lib/platform";
import { levelFromXp, titleForLevel } from "./levels";
import type { XPAward, XPSource, GamificationNotification } from "./types";

/** Daily XP soft cap to discourage mindless grinding */
const DAILY_XP_SOFT_CAP = 800;

export function calculateAnswerXp(isCorrect: boolean, difficulty: number): number {
  if (!isCorrect) return 2;
  return 10 + Math.min(5, Math.max(1, difficulty)) * 4; // 14–30
}

export function calculateSessionBonus(accuracy: number, totalQuestions: number): number {
  let bonus = 0;
  if (totalQuestions >= 5 && accuracy >= 0.8) bonus += 25;
  if (totalQuestions >= 5 && accuracy >= 0.999) bonus += 50;
  if (totalQuestions >= 10) bonus += 15;
  return bonus;
}

export function calculateExamBonus(percentage: number, questionCount: number): number {
  let bonus = Math.round(percentage / 2); // up to 50
  if (questionCount >= 40) bonus += 30;
  if (percentage >= 70) bonus += 40;
  if (percentage >= 90) bonus += 60;
  return bonus;
}

async function xpEarnedToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const events = await prisma.learningEvent.findMany({
    where: {
      userId,
      type: "xp_awarded",
      createdAt: { gte: start },
    },
    select: { payload: true },
    take: 200,
  });
  return events.reduce((s, e) => {
    const p = e.payload as { amount?: number } | null;
    return s + (p?.amount ?? 0);
  }, 0);
}

export async function awardXP(
  userId: string,
  amount: number,
  source: XPSource,
  reason: string
): Promise<XPAward> {
  if (amount <= 0) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      amount: 0,
      source,
      reason,
      leveledUp: false,
      newXp: user.xp,
      newLevel: user.playerLevel,
      notifications: [],
    };
  }

  // Soft daily cap (still grant at least 10% of award)
  const today = await xpEarnedToday(userId);
  let grant = amount;
  if (today >= DAILY_XP_SOFT_CAP) {
    grant = Math.max(1, Math.floor(amount * 0.1));
  } else if (today + amount > DAILY_XP_SOFT_CAP) {
    grant = Math.max(amount - (today + amount - DAILY_XP_SOFT_CAP), Math.floor(amount * 0.25));
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const newXp = user.xp + grant;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > user.playerLevel;
  const notifications: GamificationNotification[] = [];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        playerLevel: newLevel,
        title: leveledUp ? titleForLevel(newLevel) : user.title,
      },
    }),
    prisma.learningEvent.create({
      data: {
        userId,
        type: "xp_awarded",
        payload: { amount: grant, source, reason, requested: amount },
      },
    }),
  ]);

  if (leveledUp) {
    notifications.push({
      type: "level_up",
      title: `Level ${newLevel}!`,
      body: `You reached level ${newLevel}. Title: ${titleForLevel(newLevel)}`,
      meta: { level: newLevel },
    });
  }

  invalidate(cacheKey(["dashboard", userId]));
  await publish("MasteryUpdated", userId, { xp: newXp, level: newLevel, source });

  return {
    amount: grant,
    source,
    reason,
    leveledUp,
    newXp,
    newLevel,
    notifications,
  };
}

/** Alias matching public API name */
export const calculateXP = calculateAnswerXp;
