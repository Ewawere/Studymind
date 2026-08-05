/**
 * StudyMind Content Pipeline (v1.0)
 *
 * Versioned releases, notes, examples, formulas, misconceptions,
 * QA, review, coverage, performance SLOs, beta metrics.
 */

export * from "./types";

export {
  createRelease,
  findReleaseByVersion,
  listReleases,
  setReleaseStatus,
  attachImportToRelease,
} from "./releases";

export {
  createContentUnit,
  listContentUnits,
  QUESTION_QUALITY_CHECKLIST,
} from "./units";

export { createLearningNote, listLearningNotes } from "./notes";
export { createWorkedExample, listWorkedExamples } from "./examples";
export { createFormulaSheet, listFormulaSheets } from "./formulas";
export {
  createMisconceptionGuide,
  listMisconceptions,
} from "./misconceptions";

export {
  QUESTION_JSON_TEMPLATE,
  WAEC_MATH_TOPIC_ORDER,
  WAEC_ENGLISH_TOPIC_ORDER,
  difficultyToNumber,
  toImportRow,
} from "./templates";
export type { QuestionAuthoringPayload } from "./templates";

export { validateQuestionAuthoring, QA_CHECKLIST } from "./qa";
export type { QaIssue, QaResult } from "./qa";

export { submitReview, listReviews } from "./reviewer";
export type { ReviewDecision } from "./reviewer";

export { getCoverageReport } from "./coverage";
export type { CoverageReport } from "./coverage";

export {
  PERFORMANCE_TARGETS,
  measureAgainstSlo,
  performanceChecklist,
} from "./performance";

export { getBetaMetricsSnapshot } from "./beta-metrics";
