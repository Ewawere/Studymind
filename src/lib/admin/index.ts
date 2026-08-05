/**
 * StudyMind Admin Platform
 *
 * @example
 * import { assertPermission, getAdminDashboard, listQuestions } from "@/lib/admin";
 *
 * const actor = { userId, email, roles: ["administrator"] };
 * assertPermission(actor, "questions.read");
 * const dash = await getAdminDashboard(actor);
 */

export * from "./types";
export {
  can,
  assertPermission,
  permissionsFor,
  resolveRoles,
  isBootstrapSuperAdmin,
} from "./auth";
export { writeAudit, listAuditLogs } from "./audit";
export { getAdminDashboard } from "./dashboard";
export {
  listQuestions,
  getQuestionAdmin,
  createQuestion,
  updateQuestion,
  publishQuestion,
  archiveQuestion,
  restoreQuestion,
  softDeleteQuestion,
  bulkSetStatus,
} from "./questions";
export { runImport, listImports, getImportReport } from "./imports";
export {
  listCurricula,
  createCurriculum,
  updateCurriculum,
} from "./curricula";
export { listSubjects, createSubject, updateSubject } from "./subjects";
export { listTopics, createTopic, updateTopic } from "./topics";
export {
  listConcepts,
  createConcept,
  updateConcept,
  addPrerequisite,
  removePrerequisite,
} from "./concepts";
export {
  listUsers,
  getUserAdmin,
  resetUserStreak,
  resetUserXp,
  suspendUser,
  restoreUser,
} from "./users";
export { getPlatformAnalytics } from "./analytics";
export {
  listFlaggedQuestions,
  listLowQualityQuestions,
  resolveFlag,
} from "./moderation";
export { getSettings, updateSettings } from "./settings";
export {
  listJobs,
  enqueueJob,
  runDifficultyRecalibrationJob,
} from "./jobs";
