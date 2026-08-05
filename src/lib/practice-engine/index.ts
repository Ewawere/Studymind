/**
 * StudyMind Practice Engine — public API
 *
 * @example
 * import {
 *   createPracticeSession,
 *   getNextQuestion,
 *   submitAnswer,
 *   finishSession,
 * } from "@/lib/practice-engine";
 *
 * const session = await createPracticeSession({
 *   userId,
 *   mode: "practice",
 *   subjectIds: [physicsId],
 *   questionCount: 10,
 * });
 *
 * const q = await getNextQuestion(session.id);
 * const { feedback } = await submitAnswer({
 *   sessionId: session.id,
 *   questionId: q!.questionId,
 *   selectedKey: "B",
 *   timeSpentMs: 32000,
 * });
 */

export * from "./types";

export {
  createPracticeSession,
  resumeSession,
  getNextQuestion,
  submitAnswer,
  skipQuestion,
  finishSession,
} from "./session";

export { selectQuestionQueue } from "./selector";
export { markAnswer, buildFeedback } from "./scoring";
export { buildSessionReport } from "./analytics";
export { generateReview, recommendNextSession } from "./review";
export {
  xpForAnswer,
  xpForSessionBonus,
  levelFromXp,
  awardXp,
} from "./streaks";
export {
  nextTargetDifficulty,
  shouldInjectEasierQuestion,
} from "./adaptive";
export { listActiveSessions, abandonSession } from "./persistence";
