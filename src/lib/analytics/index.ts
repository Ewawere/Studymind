/**
 * StudyMind Analytics & Insights
 *
 * @example
 * import { getStudentDashboard, getPrediction, exportReport } from "@/lib/analytics";
 *
 * const dash = await getStudentDashboard(userId);
 * const forecast = await getPrediction(userId);
 */

export * from "./types";
export { getStudentDashboard } from "./dashboard";
export { getProgressTimeline } from "./progress";
export {
  getMasteryHeatmap,
  getSubjectAnalytics,
  getConceptAnalytics,
} from "./mastery";
export { getPerformanceReport } from "./performance";
export { getPrediction } from "./predictions";
export { generateInsightSummary } from "./insights";
export { getAnalyticsRecommendations as getRecommendations } from "./recommendations";
export { exportReport } from "./reports";
export {
  accuracyOf,
  averageMs,
  dailyBuckets,
  improvementRate,
} from "./aggregation";
