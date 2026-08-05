/**
 * Daily streak maintenance.
 * One study activity per calendar day maintains the streak.
 */

import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/platform";
import { awardXP } from "./xp";
import type { StreakState, GamificationNotification } from "./types";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function getStreak(userId: string): Promise<StreakState> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const today = dayKey(new Date());
  const last = user.lastStudyDate ? dayKey(user.lastStudyDate) : null;
  return {
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastStudyDate: user.lastStudyDate?.toISOString() ?? null,
    maintainedToday: last === today,
  };
}

export async function updateStreak(
  userId: string
): Promise<{ state: StreakState; notifications: GamificationNotification[] }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const today = dayKey(now);
  const notifications: GamificationNotification[] = [];

  let current = user.currentStreak;
  let longest = user.longestStreak;

  if (user.lastStudyDate) {
    const last = dayKey(user.lastStudyDate);
    if (last === today) {
      // already counted today
      return {
        state: {
          currentStreak: current,
          longestStreak: longest,
          lastStudyDate: user.lastStudyDate.toISOString(),
          maintainedToday: true,
        },
        notifications,
      };
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (last === dayKey(yesterday)) {
      current += 1;
    } else {
      current = 1; // broken streak
    }
  } else {
    current = 1;
  }

  if (current > longest) longest = current;

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: current,
      longestStreak: longest,
      lastStudyDate: now,
    },
  });

  // Milestone streak XP (once per day when crossing thresholds)
  if ([3, 7, 14, 30, 60, 100].includes(current)) {
    const award = await awardXP(
      userId,
      current >= 30 ? 100 : current >= 7 ? 50 : 20,
      "streak_daily",
      `${current}-day streak`
    );
    notifications.push({
      type: "streak",
      title: `${current}-day streak!`,
      body: `Consistency pays off. +${award.amount} XP`,
      meta: { streak: current },
    });
    notifications.push(...award.notifications);
  }

  await publish("StreakUpdated", userId, { currentStreak: current });

  return {
    state: {
      currentStreak: current,
      longestStreak: longest,
      lastStudyDate: now.toISOString(),
      maintainedToday: true,
    },
    notifications,
  };
}

export async function resetStreak(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: 0 },
  });
}
