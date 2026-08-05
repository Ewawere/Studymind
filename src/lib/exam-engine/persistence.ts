/**
 * Exam persistence helpers.
 */

import { prisma } from "@/lib/prisma";

const EXAM_MODES = [
  "practice_exam",
  "waec",
  "jamb",
  "post_utme",
  "university",
  "mock",
  "custom",
  "timed_quiz",
];

export async function listActiveExams(userId: string) {
  return prisma.quizAttempt.findMany({
    where: {
      userId,
      status: { in: ["draft", "active", "paused"] },
      mode: { in: EXAM_MODES },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      mode: true,
      status: true,
      title: true,
      totalQuestions: true,
      currentIndex: true,
      timeLimitSec: true,
      startedAt: true,
      updatedAt: true,
    },
  });
}

export async function abandonExam(examId: string) {
  await prisma.quizAttempt.update({
    where: { id: examId },
    data: {
      status: "abandoned",
      completedAt: new Date(),
    },
  });
}
