/**
 * Leaderboards — opt-in via ranking on public XP.
 * Scope filters are placeholders until social graph exists.
 */

import { prisma } from "@/lib/prisma";
import type { LeaderboardEntry } from "./types";

export type LeaderboardScope =
  | "global"
  | "country"
  | "curriculum";

export async function getLeaderboard(opts: {
  scope?: LeaderboardScope;
  country?: string;
  curriculumId?: string;
  limit?: number;
}): Promise<LeaderboardEntry[]> {
  const limit = Math.min(100, opts.limit ?? 20);

  const users = await prisma.user.findMany({
    where: {
      onboardingDone: true,
      ...(opts.scope === "country" && opts.country
        ? { country: opts.country }
        : {}),
      ...(opts.scope === "curriculum" && opts.curriculumId
        ? { curriculumId: opts.curriculumId }
        : {}),
    },
    orderBy: [{ xp: "desc" }, { playerLevel: "desc" }],
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      xp: true,
      playerLevel: true,
    },
  });

  return users.map((u, i) => ({
    userId: u.id,
    displayName:
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "Student",
    xp: u.xp,
    level: u.playerLevel,
    rank: i + 1,
  }));
}
