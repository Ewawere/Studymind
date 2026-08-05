/**
 * Offline support types — beta scope only.
 * Online-only: AI Tutor, auth, analytics, leaderboards, admin.
 */

export type OfflineResourceType = "note" | "question_pack" | "practice_session";

export interface CachedNote {
  id: string;
  title: string;
  body: string;
  topicName?: string;
  subjectCode?: string;
  cachedAt: string;
}

export interface CachedQuestion {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  // no correctKey in cache used for practice reveal after answer
  correctKey?: string;
  explanation?: string;
  topicName?: string;
  conceptName?: string;
  difficulty?: number;
}

export interface CachedQuestionPack {
  packId: string;
  title: string;
  curriculumCode: string;
  subjectCode: string;
  topicName?: string;
  questions: CachedQuestion[];
  cachedAt: string;
}

export interface OfflinePracticeSnapshot {
  sessionId: string;
  mode: string;
  questionIds: string[];
  currentIndex: number;
  answers: {
    questionId: string;
    selectedKey: string | null;
    isCorrect?: boolean;
    timeSpentMs?: number;
    answeredAt: string;
  }[];
  startedAt: string;
  updatedAt: string;
  status: "active" | "completed";
}

export type QueuedMutationType =
  | "answer_submitted"
  | "session_completed"
  | "session_progress";

export interface QueuedMutation {
  id: string;
  type: QueuedMutationType;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface SyncResult {
  processed: number;
  failed: number;
  remaining: number;
}

export interface NetworkStatus {
  online: boolean;
  lastOnlineAt?: string;
}
