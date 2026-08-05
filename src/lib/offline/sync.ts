/**
 * Flush offline queue to the server when connectivity returns.
 * Client-side; call from online event or app bootstrap.
 */

import {
  listQueuedMutations,
  removeQueuedMutation,
  bumpAttempt,
} from "./queue";
import type { SyncResult } from "./types";

const MAX_ATTEMPTS = 5;

export async function syncOfflineQueue(opts?: {
  endpoint?: string;
}): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = (await listQueuedMutations()).length;
    return { processed: 0, failed: 0, remaining };
  }

  const endpoint = opts?.endpoint ?? "/api/offline/sync";
  const queue = await listQueuedMutations();
  let processed = 0;
  let failed = 0;

  for (const mut of queue) {
    if (mut.attempts >= MAX_ATTEMPTS) {
      failed++;
      continue;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mut.type,
          payload: mut.payload,
          clientId: mut.id,
          createdAt: mut.createdAt,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await removeQueuedMutation(mut.id);
      processed++;
    } catch {
      await bumpAttempt(mut);
      failed++;
    }
  }

  const remaining = (await listQueuedMutations()).length;
  return { processed, failed, remaining };
}

/** Register browser online listener once */
export function startAutoSync() {
  if (typeof window === "undefined") return () => undefined;

  const run = () => {
    void syncOfflineQueue().catch(() => undefined);
  };

  window.addEventListener("online", run);
  // also try shortly after load
  setTimeout(run, 1500);

  return () => window.removeEventListener("online", run);
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function offlineTutorMessage() {
  return "Connect to the internet to continue with AI Tutor.";
}
