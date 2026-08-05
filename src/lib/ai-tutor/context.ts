/**
 * Build complete TutorContext from Learning Brain, Question Bank,
 * Practice Engine, and user profile.
 */

import { prisma } from "@/lib/prisma";
import { getAITutorContext } from "@/lib/learning-brain";
import { getQuestionAIContext } from "@/lib/question-bank";
import type { ExplanationStyle, TutorContext, TutorRequest } from "./types";

const STYLE_MAP: Record<string, ExplanationStyle> = {
  simple: "simple",
  beginner: "beginner",
  detailed: "professor",
  examples: "nigerian_examples",
  socratic: "teacher",
  like_im_10: "like_im_10",
  professor: "professor",
  teacher: "teacher",
  best_friend: "best_friend",
  step_by_step: "step_by_step",
  nigerian_examples: "nigerian_examples",
  football_analogies: "football_analogies",
  anime_analogies: "anime_analogies",
  exam_focused: "exam_focused",
};

function resolveStyle(
  preferred?: string | null,
  override?: ExplanationStyle
): ExplanationStyle {
  if (override) return override;
  if (preferred && STYLE_MAP[preferred]) return STYLE_MAP[preferred];
  return "teacher";
}

export async function buildTutorContext(
  req: TutorRequest
): Promise<TutorContext> {
  const [user, brain] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      include: { curriculum: true },
    }),
    getAITutorContext(req.userId).catch(() => null),
  ]);

  // Question context
  let question: TutorContext["question"] = null;
  if (req.questionId) {
    const q = await getQuestionAIContext(req.questionId);
    if (q) {
      question = {
        id: q.id,
        stem: q.stem,
        options: q.options,
        correctKey: q.correctKey,
        explanation: q.explanation,
        commonMistakes: q.commonMistakes,
        learningObjectives: q.learningObjectives,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        concepts: q.concepts.map((c) => ({ id: c.id, name: c.name })),
        prerequisites: q.prerequisites,
      };
    }
  }

  // Practice session
  let session: TutorContext["session"] = null;
  if (req.sessionId) {
    const s = await prisma.quizAttempt.findUnique({
      where: { id: req.sessionId },
    });
    if (s) {
      session = {
        id: s.id,
        mode: s.mode,
        score: s.score,
        correctCount: s.correctCount,
        totalQuestions: s.totalQuestions,
        currentIndex: s.currentIndex,
      };
    }
  }

  // Conversation messages
  let conversationId = req.conversationId ?? null;
  let recentMessages: TutorContext["recentMessages"] = [];
  if (conversationId) {
    const msgs = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    recentMessages = msgs
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
  }

  return {
    userId: req.userId,
    curriculumCode: user.curriculum?.code ?? null,
    level: user.level,
    primaryFocus: user.primaryFocus,
    learningGoals: user.learningGoals,
    preferredStyle: resolveStyle(user.preferredExplanationStyle, req.style),
    dailyStudyTargetMin: user.dailyStudyTargetMin ?? 45,
    examDate: user.targetExamDate,

    weakConcepts:
      brain?.weakConcepts.slice(0, 8).map((w) => ({
        conceptId: w.conceptId,
        name: w.conceptName,
        mastery: w.masteryScore,
        confidence: w.confidence,
        reasons: w.reasons,
      })) ?? [],
    strongConcepts:
      brain?.strongConcepts.slice(0, 5).map((s) => ({
        conceptId: s.conceptId,
        name: s.name,
        mastery: s.masteryScore,
      })) ?? [],
    examReadiness: brain?.examReadiness.score ?? null,
    currentStreak: brain?.currentStreak ?? user.currentStreak,
    narratives: brain?.narratives ?? [],

    question,
    session,
    conversationId,
    recentMessages,
    activeTopic:
      question?.concepts[0]?.name ??
      user.primaryFocus ??
      null,
  };
}
