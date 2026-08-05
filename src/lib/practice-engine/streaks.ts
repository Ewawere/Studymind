/**
 * XP + level progression
 *
 * Level formula: level = floor(sqrt(xp / 50)) + 1
 * XP per correct answer scales with difficulty.
 */

import { prisma } from "@/lib/prisma";

export function xpForAnswer(isCorrect: boolean, difficulty: number): number {
  if (!isCorrect) return 2; // participation XP
  return 10 + difficulty * 4; // 14–30
}

export function xpForSessionBonus(accuracy: number, totalQuestions: number): number {
  let bonus = 0;
  if (totalQuestions >= 5 && accuracy >= 0.8) bonus += 25;
  if (totalQuestions >= 5 && accuracy === 1) bonus += 50; // perfect
  if (totalQuestions >= 10) bonus += 15;
  return bonus;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export async function awardXp(
  userId: string,
  amount: number
): Promise<{ xp: number; playerLevel: number; leveledUp: boolean }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const newXp = user.xp + amount;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > user.playerLevel;

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXp, playerLevel: newLevel },
  });

  return { xp: newXp, playerLevel: newLevel, leveledUp };
}
