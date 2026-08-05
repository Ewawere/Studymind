/**
 * Autosave / resume helpers
 *
 * Session state is persisted after every answer in session.ts.
 * These helpers support listing and abandoning sessions.
 */

import { prisma } from "@/lib/prisma";
import type { SessionSnapshot, SessionMode } from "./types";

export async function listActiveSessions(
  userId: string
): Promise<SessionSnapshot[]> {
  const rows = await prisma.quizAttempt.findMany({
    where: { userId, status: "active" },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    mode: row.mode as SessionMode,
    status: "active",
    title: row.title,
    subjectIds: row.subjectIds,
    topicIds: row.topicIds,
    conceptIds: row.conceptIds,
    questionQueue: row.questionQueue,
    currentIndex: row.currentIndex,
    totalQuestions: row.totalQuestions,
    correctCount: row.correctCount,
    skippedCount: row.skippedCount,
    score: row.score,
    xpEarned: row.xpEarned,
    timeLimitSec: row.timeLimitSec,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  }));
}

export async function abandonSession(sessionId: string): Promise<void> {
  await prisma.quizAttempt.update({
    where: { id: sessionId },
    data: {
      status: "abandoned",
      completedAt: new Date(),
    },
  });
}
