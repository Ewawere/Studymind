/**
 * Badge catalog.
 */

import { prisma } from "@/lib/prisma";
import type { BadgeDef } from "./types";

export const BADGE_CATALOG: BadgeDef[] = [
  { code: "bronze_starter", title: "Bronze Starter", tier: "bronze", description: "Reach level 5" },
  { code: "silver_scholar", title: "Silver Scholar", tier: "silver", description: "Reach level 15" },
  { code: "gold_mind", title: "Gold Mind", tier: "gold", description: "Reach level 25" },
  { code: "platinum_focus", title: "Platinum Focus", tier: "platinum", description: "30-day streak" },
  { code: "diamond_grit", title: "Diamond Grit", tier: "diamond", description: "1000 questions answered" },
  { code: "legend", title: "Legend", tier: "legend", description: "Reach level 50" },
];

export async function getBadges(userId: string) {
  const unlocked = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
  });
  const codes = new Set(unlocked.map((b) => b.code));
  return BADGE_CATALOG.map((b) => ({
    ...b,
    unlocked: codes.has(b.code),
    unlockedAt: unlocked.find((u) => u.code === b.code)?.unlockedAt ?? null,
  }));
}

export async function unlockBadge(
  userId: string,
  code: string
): Promise<boolean> {
  const def = BADGE_CATALOG.find((b) => b.code === code);
  if (!def) return false;
  try {
    await prisma.userBadge.create({
      data: { userId, code, tier: def.tier },
    });
    await prisma.learningEvent.create({
      data: {
        userId,
        type: "badge_unlocked",
        payload: { code, tier: def.tier },
      },
    });
    return true;
  } catch {
    return false; // already unlocked
  }
}

export async function evaluateBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const answered = await prisma.questionAttempt.count({
    where: { userId, skipped: false },
  });
  const unlocked: string[] = [];

  const checks: [string, boolean][] = [
    ["bronze_starter", user.playerLevel >= 5],
    ["silver_scholar", user.playerLevel >= 15],
    ["gold_mind", user.playerLevel >= 25],
    ["platinum_focus", user.longestStreak >= 30],
    ["diamond_grit", answered >= 1000],
    ["legend", user.playerLevel >= 50],
  ];

  for (const [code, ok] of checks) {
    if (ok && (await unlockBadge(userId, code))) unlocked.push(code);
  }
  return unlocked;
}
