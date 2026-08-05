/**
 * StudyMind Platform Infrastructure
 */

export { on, publish } from "./events";
export type { DomainEvent, DomainEventType } from "./events";

export {
  cached,
  cacheGet,
  cacheSet,
  invalidate,
  invalidateAsync,
  cacheKey,
  cacheBackend,
} from "./cache";

export { platformConfig, validateEnv } from "./config";
export type { EnvIssue } from "./config";

export { inc, getMetrics, resetMetrics } from "./metrics";
export { log } from "./logging";
export {
  observeLatency,
  latencyStats,
  timed,
  captureException,
  snapshotMetrics,
} from "./monitoring";

export { enqueue, registerJob, queueDepth } from "./queue";
export type { JobName, JobPayload } from "./queue";

export { putObject, storageConfigured } from "./storage";
export { uploadQuestionMedia, uploadImportFile } from "./uploads";

export { sendNotification, queueNotification } from "./notifications";
export type { NotificationMessage, NotificationChannel } from "./notifications";

export { health, readiness, liveness } from "./health";
export {
  rateLimit,
  securityHeaders,
  applySecurityHeaders,
} from "./security";

export {
  exportMetadataSnapshot,
  recordBackupEvent,
  backupPolicy,
} from "./backups";

export {
  scheduleRecurring,
  cancelSchedule,
  startDefaultSchedules,
} from "./scheduler";

export {
  isFeatureEnabled,
  assertFeature,
  setFeatureFlags,
  listFeatureFlags,
} from "./feature-flags";

export { globalSearch } from "./search";
export type { SearchHit } from "./search";
