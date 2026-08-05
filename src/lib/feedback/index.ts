/**
 * StudyMind Feedback & Experimentation
 *
 * Collect bugs, feature ratings, NPS, surveys, and run simple A/B tests.
 *
 * @example
 * import { submitBugReport, submitNps, getVariant } from "@/lib/feedback";
 *
 * await submitBugReport({ userId, title, description, page: "/practice" });
 * const style = await getVariant(userId, "tutor_style_default");
 */

export * from "./types";

export {
  submitBugReport,
  listBugReports,
  updateBugStatus,
} from "./bug-reports";

export {
  submitFeatureFeedback,
  getFeatureRatings,
} from "./feature-feedback";

export { submitNps, aggregateNps } from "./nps";

export { submitSurvey, listSurveyResponses } from "./surveys";

export {
  EXPERIMENTS,
  getExperiment,
  assignVariant,
  getVariant,
  trackExperimentExposure,
  trackExperimentConversion,
} from "./experiments";
