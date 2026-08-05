/**
 * Wire gamification to platform events.
 * Call registerGamificationListeners() once at app boot.
 */

import { on, type DomainEvent } from "@/lib/platform";
import { awardXP, calculateAnswerXp, calculateSessionBonus, calculateExamBonus } from "./xp";
import { updateStreak } from "./streaks";
import { evaluateAchievements } from "./achievements";
import { evaluateBadges } from "./badges";
import { progressChallenge } from "./challenges";

let registered = false;

export function registerGamificationListeners(): void {
  if (registered) return;
  registered = true;

  on("QuestionAnswered", handleQuestionAnswered);
  on("PracticeSessionCompleted", handlePracticeCompleted);
  on("ExamSubmitted", handleExamSubmitted);
  on("MasteryUpdated", handleMasteryUpdated);
  on("*", async (event) => {
    // lightweight challenge metrics for any study signal
    if (
      event.type === "QuestionAnswered" ||
      event.type === "PracticeSessionCompleted" ||
      event.type === "ExamSubmitted"
    ) {
      await updateStreak(event.userId).catch(() => undefined);
    }
  });
}

async function handleQuestionAnswered(event: DomainEvent) {
  const p = event.payload as {
    isCorrect?: boolean;
    difficulty?: number;
    timeSpentMs?: number;
  };
  const xp = calculateAnswerXp(!!p.isCorrect, p.difficulty ?? 3);
  await awardXP(
    event.userId,
    xp,
    p.isCorrect ? "answer_correct" : "answer_incorrect",
    p.isCorrect ? "Correct answer" : "Attempt"
  );
  await progressChallenge(event.userId, "questions", 1);
  if (p.timeSpentMs) {
    await progressChallenge(
      event.userId,
      "minutes",
      Math.max(1, Math.round(p.timeSpentMs / 60000))
    );
  }
}

async function handlePracticeCompleted(event: DomainEvent) {
  const p = event.payload as {
    accuracy?: number;
    totalQuestions?: number;
    mode?: string;
  };
  const bonus = calculateSessionBonus(p.accuracy ?? 0, p.totalQuestions ?? 0);
  if (bonus > 0) {
    await awardXP(event.userId, bonus, "session_complete", "Session bonus");
  }
  await progressChallenge(event.userId, "sessions", 1);
  if (p.mode === "revision") {
    await progressChallenge(event.userId, "reviews", p.totalQuestions ?? 1);
  }
  await evaluateAchievements(event.userId);
  await evaluateBadges(event.userId);
}

async function handleExamSubmitted(event: DomainEvent) {
  const p = event.payload as {
    percentage?: number;
    questionCount?: number;
  };
  const bonus = calculateExamBonus(p.percentage ?? 0, p.questionCount ?? 0);
  await awardXP(event.userId, bonus, "exam_complete", "Exam completed");
  await progressChallenge(event.userId, "sessions", 1);
  await evaluateAchievements(event.userId);
  await evaluateBadges(event.userId);
}

async function handleMasteryUpdated(event: DomainEvent) {
  const p = event.payload as { mastery?: number; conceptMastered?: boolean };
  if (p.conceptMastered) {
    await awardXP(event.userId, 40, "concept_mastered", "Concept mastered");
  }
  await evaluateAchievements(event.userId);
  await evaluateBadges(event.userId);
}
