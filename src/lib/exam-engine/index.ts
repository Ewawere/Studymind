/**
 * StudyMind CBT / Exam Engine
 *
 * Fixed-question, timed examinations separate from Practice Engine.
 * Shares objective marking via @/lib/assessment.
 *
 * @example
 * const exam = await createExam(userId, {
 *   mode: "jamb",
 *   subjectIds: [physicsId],
 *   questionCount: 40,
 *   timeLimitSec: 3600,
 *   selection: "difficulty_balanced",
 * });
 * await startExam(exam.id);
 * await saveAnswer({ examId: exam.id, questionId, selectedKey: "B" });
 * const result = await submitExam(exam.id);
 */

export * from "./types";

export {
  createExam,
  startExam,
  resumeExam,
  getExamQuestion,
  saveAnswer,
  markForReview,
  clearAnswer,
  navigateQuestion,
  recordIntegrityEvent,
  submitExam,
  generateExamReport,
} from "./exam";

export { selectExamQuestions } from "./selector";
export {
  computeEndsAt,
  remainingSeconds,
  isExpired,
  elapsedSeconds,
} from "./timer";
export { paletteFromState, resolveNavigateIndex } from "./navigation";
export { getExamReview } from "./review";
export { listActiveExams, abandonExam } from "./persistence";
export { buildExamReport } from "./analytics";
