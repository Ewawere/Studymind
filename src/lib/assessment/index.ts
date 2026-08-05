/**
 * Shared Assessment Core
 * Common logic for Practice Engine + Exam Engine.
 */

export * from "./types";
export {
  markObjectiveAnswer,
  gradeFromPercentage,
  summarizeScore,
} from "./scoring";
