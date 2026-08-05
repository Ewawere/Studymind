/**
 * Mistake review + next session recommendations
 */

import { prisma } from "@/lib/prisma";
import { getRecommendations } from "@/lib/learning-brain";
import type { ReviewItem, NextSessionRecommendation } from "./types";

export async function generateReview(
  sessionId: string
): Promise<ReviewItem[]> {
  const wrong = await prisma.questionAttempt.findMany({
    where: {
      quizAttemptId: sessionId,
      isCorrect: false,
      skipped: false,
    },
    include: {
      question: {
        select: {
          id: true,
          stem: true,
          correctKey: true,
          explanation: true,
          concept: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return wrong.map((a) => ({
    questionId: a.questionId,
    stem: a.question.stem,
    selectedKey: a.selectedKey,
    correctKey: a.question.correctKey,
    explanation: a.question.explanation,
    conceptName: a.question.concept?.name,
  }));
}

export async function recommendNextSession(
  userId: string
): Promise<NextSessionRecommendation[]> {
  const recs: NextSessionRecommendation[] = [];

  // Due reviews from Learning Brain
  const brainRecs = await getRecommendations(userId);
  const dueCount = brainRecs.filter((r) => r.type === "review_today").length;
  const weakCount = brainRecs.filter((r) => r.type === "weak_focus").length;

  if (dueCount >= 3) {
    recs.push({
      mode: "revision",
      title: "Revision session",
      reason: `${dueCount} concepts are due for spaced repetition today`,
      questionCount: Math.min(15, dueCount + 2),
      priority: "critical",
    });
  }

  if (weakCount >= 2) {
    const conceptIds = brainRecs
      .filter((r) => r.type === "weak_focus" && r.conceptId)
      .map((r) => r.conceptId!) 
      .slice(0, 5);
    recs.push({
      mode: "weakness",
      title: "Strengthen weak areas",
      reason: brainRecs.find((r) => r.type === "weak_focus")?.reason ?? "Low mastery concepts",
      conceptIds,
      questionCount: 10,
      priority: "high",
    });
  }

  // Exam proximity
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.targetExamDate) {
    const days =
      (user.targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days <= 14) {
      recs.push({
        mode: "exam",
        title: "Timed exam simulation",
        reason: `Exam in ${Math.ceil(days)} days`,
        subjectIds: user.curriculumId ? undefined : undefined,
        questionCount: 40,
        priority: "critical",
      });
    }
  }

  // Default adaptive practice
  recs.push({
    mode: "practice",
    title: "Adaptive practice",
    reason: "Balanced mix of weak topics, reviews, and new material",
    questionCount: 10,
    priority: "medium",
  });

  // Challenge if strong
  const mastery = await prisma.subjectMastery.findMany({
    where: { userId },
    orderBy: { masteryScore: "desc" },
    take: 1,
  });
  if (mastery[0] && mastery[0].masteryScore >= 75) {
    recs.push({
      mode: "challenge",
      title: "Challenge mode",
      reason: "High mastery — push difficulty",
      subjectIds: [mastery[0].subjectId],
      questionCount: 10,
      priority: "low",
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}
