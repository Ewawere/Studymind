/**
 * Student management + support tools.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor, UserAdminFilters } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

export async function listUsers(
  actor: AdminActor,
  filters: UserAdminFilters = {}
) {
  assertPermission(actor, "users.read");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 20);

  const where: Record<string, unknown> = {};
  if (filters.plan) where.plan = filters.plan;
  if (filters.onboardingDone != null) where.onboardingDone = filters.onboardingDone;
  if (filters.q) {
    where.OR = [
      { email: { contains: filters.q, mode: "insensitive" } },
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
        onboardingDone: true,
        currentStreak: true,
        xp: true,
        playerLevel: true,
        lastStudyDate: true,
        createdAt: true,
        curriculum: { select: { code: true, name: true } },
      },
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getUserAdmin(actor: AdminActor, userId: string) {
  assertPermission(actor, "users.read");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      curriculum: true,
      subjectMasteries: { include: { subject: true } },
      achievements: true,
      badges: true,
      _count: {
        select: {
          questionAttempts: true,
          quizAttempts: true,
          conversations: true,
        },
      },
    },
  });
  return user;
}

export async function resetUserStreak(actor: AdminActor, userId: string) {
  assertPermission(actor, "users.support");
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: 0 },
  });
  await writeAudit(actor, "user.reset_streak", "User", userId);
}

export async function resetUserXp(actor: AdminActor, userId: string) {
  assertPermission(actor, "users.support");
  await prisma.user.update({
    where: { id: userId },
    data: { xp: 0, playerLevel: 1 },
  });
  await writeAudit(actor, "user.reset_xp", "User", userId);
}

export async function suspendUser(actor: AdminActor, userId: string) {
  assertPermission(actor, "users.write");
  // Soft suspend via learning event flag until dedicated status field exists
  await prisma.learningEvent.create({
    data: {
      userId,
      type: "account_suspended",
      payload: { by: actor.userId },
    },
  });
  await writeAudit(actor, "user.suspend", "User", userId);
}

export async function restoreUser(actor: AdminActor, userId: string) {
  assertPermission(actor, "users.write");
  await prisma.learningEvent.create({
    data: {
      userId,
      type: "account_restored",
      payload: { by: actor.userId },
    },
  });
  await writeAudit(actor, "user.restore", "User", userId);
}
