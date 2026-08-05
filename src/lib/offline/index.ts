/**
 * StudyMind Offline Support (Beta)
 *
 * Offline: notes, question packs, practice resume, progress queue + sync
 * Online-only: AI Tutor, auth, analytics, leaderboards, admin
 */

export * from "./types";

export {
  cacheNote,
  getCachedNote,
  listCachedNotes,
  cacheQuestionPack,
  getCachedQuestionPack,
  listCachedQuestionPacks,
  removeCachedPack,
  removeCachedNote,
} from "./cache";

export {
  savePracticeSnapshot,
  getPracticeSnapshot,
  listActivePracticeSnapshots,
  markPracticeCompleted,
  clearPracticeSnapshot,
  appendLocalAnswer,
} from "./practice";

export {
  enqueueMutation,
  listQueuedMutations,
  removeQueuedMutation,
  queueDepth,
} from "./queue";

export {
  syncOfflineQueue,
  startAutoSync,
  isOnline,
  offlineTutorMessage,
} from "./sync";
