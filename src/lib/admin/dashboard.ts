/**
 * Admin home dashboard aggregates.
 */

import { prisma } from "@/lib/prisma";
import type { AdminActor, AdminDashboard } from "./types";
import { assertPermission } from "./auth";

export async function getAdminDashboard(
  actor: AdminActor
): Promise<AdminDashboard> {
  assertPermission(actor, "admin.access");

  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const [
    usersTotal,
    usersActive7d,
    questionsTotal,
    questionsActive,
    importsRecent,
    practiceSessions7d,
    examSessions7d,
    tutorConversations7d,
    flaggedQuestions,
    recentUsers,
    recentImports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastStudyDate: { gte: since7 } } }),
    prisma.question.count(),
    prisma.question.count({ where: { status: "ACTIVE", isActive: true } }),
    prisma.questionImport.count({ where: { createdAt: { gte: since7 } } }),
    prisma.quizAttempt.count({
      where: {
        createdAt: { gte: since7 },
        mode: { in: ["practice", "weakness", "revision", "challenge"] },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        createdAt: { gte: since7 },
        mode: {
          in: ["exam", "waec", "jamb", "post_utme", "mock", "practice_exam"],
        },
      },
    }),
    prisma.conversation.count({ where: { createdAt: { gte: since7 } } }),
    prisma.question.count({ where: { status: "DUPLICATE_FLAGGED" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.questionImport.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const alerts: string[] = [];
  if (flaggedQuestions > 0) {
    alerts.push(`${flaggedQuestions} questions flagged as possible duplicates`);
  }
  if (questionsActive < 50) {
    alerts.push("Active question bank is still small — import more content");
  }

  return {
    usersTotal,
    usersActive7d,
    questionsTotal,
    questionsActive,
    importsRecent,
    practiceSessions7d,
    examSessions7d,
    tutorConversations7d,
    flaggedQuestions,
    pendingReviews: flaggedQuestions,
    recentRegistrations: recentUsers.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt.toISOString(),
    })),
    recentImports: recentImports.map((i) => ({
      id: i.id,
      fileName: i.fileName,
      status: i.status,
      importedCount: i.importedCount,
      createdAt: i.createdAt.toISOString(),
    })),
    alerts,
  };
}
