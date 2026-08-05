/**
 * Achievement definitions + evaluation.
 */

import { prisma } from "@/lib/prisma";
import { awardXP } from "./xp";
import type { AchievementDef, GamificationNotification } from "./types";

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  { code: "first_practice", title: "First Practice", description: "Complete your first practice session", xpReward: 25, category: "milestone" },
  { code: "first_exam", title: "First Exam", description: "Submit your first exam", xpReward: 40, category: "exam" },
  { code: "q_100", title: "Century", description: "Answer 100 questions", xpReward: 50, category: "milestone" },
  { code: "q_1000", title: "Millennial Mind", description: "Answer 1000 questions", xpReward: 150, category: "milestone" },
  { code: "streak_7", title: "Week Warrior", description: "7-day study streak", xpReward: 60, category: "streak" },
  { code: "streak_30", title: "Monthly Momentum", description: "30-day study streak", xpReward: 150, category: "streak" },
  { code: "perfect_score", title: "Perfect Score", description: "100% on a session of 5+ questions", xpReward: 75, category: "exam" },
  { code: "physics_master", title: "Physics Master", description: "Reach 80% mastery in Physics", xpReward: 100, category: "mastery" },
  { code: "chemistry_master", title: "Chemistry Master", description: "Reach 80% mastery in Chemistry", xpReward: 100, category: "mastery" },
  { code: "fast_thinker", title: "Fast Thinker", description: "Average response under 20s with 70%+ accuracy (50+ Qs)", xpReward: 80, category: "special" },
  { code: "persistent", title: "Persistent Learner", description: "Study on 14 different days", xpReward: 90, category: "streak" },
  { code: "revision_champ", title: "Revision Champion", description: "Complete 50 SM-2 reviews", xpReward: 70, category: "mastery" },
  { code: "tutor_explorer", title: "AI Tutor Explorer", description: "Have 10 tutor conversations", xpReward: 40, category: "special" },
];

export async function getAchievements(userId: string) {
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
  });
  const codes = new Set(unlocked.map((a) => a.code));
  return ACHIEVEMENT_CATALOG.map((a) => ({
    ...a,
    unlocked: codes.has(a.code),
    unlockedAt: unlocked.find((u) => u.code === a.code)?.unlockedAt ?? null,
  }));
}

export async function unlockAchievement(
  userId: string,
  code: string
): Promise<GamificationNotification | null> {
  const def = ACHIEVEMENT_CATALOG.find((a) => a.code === code);
  if (!def) return null;

  try {
    await prisma.userAchievement.create({
      data: { userId, code },
    });
  } catch {
    return null; // duplicate
  }

  if (def.xpReward > 0) {
    await awardXP(userId, def.xpReward, "achievement", def.title);
  }

  await prisma.learningEvent.create({
    data: {
      userId,
      type: "achievement_unlocked",
      payload: { code, title: def.title },
    },
  });

  return {
    type: "achievement",
    title: "Achievement unlocked",
    body: `${def.title}: ${def.description}`,
    meta: { code },
  };
}

export async function evaluateAchievements(
  userId: string
): Promise<GamificationNotification[]> {
  const [
    user,
    answered,
    practiceDone,
    examDone,
    perfect,
    masteries,
    conversations,
    reviewReps,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.questionAttempt.count({ where: { userId, skipped: false } }),
    prisma.quizAttempt.count({
      where: {
        userId,
        status: "completed",
        mode: { in: ["practice", "weakness", "revision", "challenge"] },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        userId,
        status: { in: ["submitted", "completed"] },
        mode: { in: ["exam", "waec", "jamb", "post_utme", "mock", "practice_exam"] },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        userId,
        status: { in: ["completed", "submitted"] },
        totalQuestions: { gte: 5 },
        score: { gte: 99.9 },
      },
    }),
    prisma.subjectMastery.findMany({
      where: { userId },
      include: { subject: true },
    }),
    prisma.conversation.count({ where: { userId } }),
    prisma.conceptState.aggregate({
      where: { userId },
      _sum: { repetitions: true },
    }),
  ]);

  const checks: [string, boolean][] = [
    ["first_practice", practiceDone >= 1],
    ["first_exam", examDone >= 1],
    ["q_100", answered >= 100],
    ["q_1000", answered >= 1000],
    ["streak_7", user.currentStreak >= 7 || user.longestStreak >= 7],
    ["streak_30", user.longestStreak >= 30],
    ["perfect_score", perfect >= 1],
    [
      "physics_master",
      masteries.some(
        (m) =>
          /physics/i.test(m.subject.name) && m.masteryScore >= 80
      ),
    ],
    [
      "chemistry_master",
      masteries.some(
        (m) =>
          /chem/i.test(m.subject.name) && m.masteryScore >= 80
      ),
    ],
    ["tutor_explorer", conversations >= 10],
    ["revision_champ", (reviewReps._sum.repetitions ?? 0) >= 50],
  ];

  const notes: GamificationNotification[] = [];
  for (const [code, ok] of checks) {
    if (ok) {
      const n = await unlockAchievement(userId, code);
      if (n) notes.push(n);
    }
  }
  return notes;
}
