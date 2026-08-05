/**
 * Offline practice session snapshots — resume after reload / brief offline.
 */

import { putRecord, getRecord, getAllRecords, deleteRecord } from "./storage";
import type { OfflinePracticeSnapshot } from "./types";

export async function savePracticeSnapshot(
  snapshot: OfflinePracticeSnapshot
) {
  const row = {
    ...snapshot,
    id: snapshot.sessionId,
    updatedAt: new Date().toISOString(),
  };
  await putRecord("sessions", row);
  return row;
}

export async function getPracticeSnapshot(sessionId: string) {
  return getRecord<OfflinePracticeSnapshot & { id: string }>(
    "sessions",
    sessionId
  );
}

export async function listActivePracticeSnapshots() {
  const all = await getAllRecords<OfflinePracticeSnapshot & { id: string }>(
    "sessions"
  );
  return all.filter((s) => s.status === "active");
}

export async function markPracticeCompleted(sessionId: string) {
  const existing = await getPracticeSnapshot(sessionId);
  if (!existing) return null;
  const next = {
    ...existing,
    status: "completed" as const,
    updatedAt: new Date().toISOString(),
  };
  await putRecord("sessions", next);
  return next;
}

export async function clearPracticeSnapshot(sessionId: string) {
  await deleteRecord("sessions", sessionId);
}

/** Record a local answer into the snapshot */
export async function appendLocalAnswer(
  sessionId: string,
  answer: OfflinePracticeSnapshot["answers"][number]
) {
  const existing = await getPracticeSnapshot(sessionId);
  if (!existing) return null;
  const answers = [
    ...existing.answers.filter((a) => a.questionId !== answer.questionId),
    answer,
  ];
  const next: OfflinePracticeSnapshot & { id: string } = {
    ...existing,
    answers,
    currentIndex: Math.min(
      existing.currentIndex + 1,
      Math.max(0, existing.questionIds.length - 1)
    ),
    updatedAt: new Date().toISOString(),
  };
  await putRecord("sessions", next);
  return next;
}
