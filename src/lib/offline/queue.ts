/**
 * Queue progress mutations while offline; flush when online.
 */

import { putRecord, getAllRecords, deleteRecord } from "./storage";
import type { QueuedMutation, QueuedMutationType } from "./types";

function id() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueMutation(
  type: QueuedMutationType,
  payload: Record<string, unknown>
) {
  const row: QueuedMutation & { id: string } = {
    id: id(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await putRecord("queue", row);
  return row;
}

export async function listQueuedMutations() {
  const rows = await getAllRecords<QueuedMutation & { id: string }>("queue");
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedMutation(id: string) {
  await deleteRecord("queue", id);
}

export async function bumpAttempt(mut: QueuedMutation & { id: string }) {
  const next = { ...mut, attempts: mut.attempts + 1 };
  await putRecord("queue", next);
  return next;
}

export async function queueDepth() {
  const rows = await listQueuedMutations();
  return rows.length;
}
