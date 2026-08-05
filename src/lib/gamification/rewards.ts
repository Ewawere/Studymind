/**
 * Reward claims — single claim per challenge period.
 */

import { prisma } from "@/lib/prisma";
import { awardXP } from "./xp";
import { CHALLENGE_CATALOG } from "./challenges";
import type { GamificationNotification } from "./types";

export async function claimReward(
  userId: string,
  challengeCode: string,
  periodKey: string
): Promise<{ ok: boolean; notifications: GamificationNotification[] }> {
  const def = CHALLENGE_CATALOG.find((c) => c.code === challengeCode);
  if (!def) return { ok: false, notifications: [] };

  const row = await prisma.userChallenge.findUnique({
    where: {
      userId_code_periodKey: {
        userId,
        code: challengeCode,
        periodKey,
      },
    },
  });

  if (!row || !row.completedAt) {
    return { ok: false, notifications: [] };
  }
  if (row.claimedAt) {
    return { ok: false, notifications: [] }; // already claimed
  }

  await prisma.userChallenge.update({
    where: { id: row.id },
    data: { claimedAt: new Date() },
  });

  const award = await awardXP(
    userId,
    def.xpReward,
    "challenge",
    `Challenge: ${def.title}`
  );

  const notifications: GamificationNotification[] = [
    {
      type: "challenge_complete",
      title: "Challenge complete",
      body: `${def.title} — claimed +${award.amount} XP`,
      meta: { code: challengeCode },
    },
    ...award.notifications,
  ];

  return { ok: true, notifications };
}
