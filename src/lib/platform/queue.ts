/**
 * Queue abstraction.
 * Default: in-process async jobs (dev / single instance).
 * Production: set REDIS_URL and install bullmq for Redis-backed workers.
 */

import { log } from "./logging";
import { inc } from "./metrics";
import { platformConfig } from "./config";

export type JobName =
  | "question_import"
  | "analytics_aggregate"
  | "difficulty_recalibrate"
  | "prediction_refresh"
  | "leaderboard_rebuild"
  | "send_notification"
  | "sm2_reminders"
  | "report_export"
  | "media_process";

export interface JobPayload {
  [key: string]: unknown;
}

type Handler = (payload: JobPayload) => Promise<void>;

const handlers = new Map<JobName, Handler>();
const inlineQueue: { name: JobName; payload: JobPayload }[] = [];
let draining = false;

export function registerJob(name: JobName, handler: Handler) {
  handlers.set(name, handler);
}

export async function enqueue(
  name: JobName,
  payload: JobPayload = {}
): Promise<{ id: string }> {
  const id = `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  inc(`queue.enqueued.${name}`);
  log.info("job.enqueued", { id, name });

  // Prefer BullMQ when redis available
  if (platformConfig.redisUrl) {
    try {
      const bull = await import("bullmq").catch(() => null);
      if (bull) {
        const connection = { url: platformConfig.redisUrl };
        const queue = new bull.Queue(name, { connection });
        await queue.add(name, payload, { jobId: id, removeOnComplete: 1000 });
        await queue.close();
        return { id };
      }
    } catch (e) {
      log.warn("bullmq.fallback_inline", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  inlineQueue.push({ name, payload });
  void drainInline();
  return { id };
}

async function drainInline() {
  if (draining) return;
  draining = true;
  while (inlineQueue.length) {
    const job = inlineQueue.shift()!;
    const handler = handlers.get(job.name);
    if (!handler) {
      log.warn("job.no_handler", { name: job.name });
      continue;
    }
    try {
      await handler(job.payload);
      inc(`queue.completed.${job.name}`);
    } catch (e) {
      inc(`queue.failed.${job.name}`);
      log.error("job.failed", {
        name: job.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  draining = false;
}

export function queueDepth(): number {
  return inlineQueue.length;
}
