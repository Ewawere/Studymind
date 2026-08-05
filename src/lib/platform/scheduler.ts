/**
 * Simple interval scheduler for process-local recurring work.
 * In production prefer host cron, Vercel cron, or Inngest schedules.
 */

import { log } from "./logging";
import { enqueue, type JobName } from "./queue";

interface Schedule {
  name: string;
  everyMs: number;
  job: JobName;
  payload?: Record<string, unknown>;
  timer?: ReturnType<typeof setInterval>;
}

const schedules: Schedule[] = [];

export function scheduleRecurring(opts: {
  name: string;
  everyMs: number;
  job: JobName;
  payload?: Record<string, unknown>;
}) {
  // clear existing same name
  cancelSchedule(opts.name);

  const entry: Schedule = {
    name: opts.name,
    everyMs: opts.everyMs,
    job: opts.job,
    payload: opts.payload,
  };

  entry.timer = setInterval(() => {
    void enqueue(opts.job, opts.payload ?? {}).catch((e) =>
      log.error("scheduler.enqueue_failed", {
        name: opts.name,
        error: e instanceof Error ? e.message : String(e),
      })
    );
  }, opts.everyMs);

  // unref so it doesn't keep process alive in scripts
  if (typeof entry.timer.unref === "function") entry.timer.unref();

  schedules.push(entry);
  log.info("scheduler.started", { name: opts.name, everyMs: opts.everyMs });
}

export function cancelSchedule(name: string) {
  const idx = schedules.findIndex((s) => s.name === name);
  if (idx >= 0) {
    const s = schedules[idx];
    if (s.timer) clearInterval(s.timer);
    schedules.splice(idx, 1);
  }
}

/** Default production schedules — call from worker bootstrap */
export function startDefaultSchedules() {
  scheduleRecurring({
    name: "sm2_reminders",
    everyMs: 60 * 60 * 1000,
    job: "sm2_reminders",
  });
  scheduleRecurring({
    name: "leaderboard_rebuild",
    everyMs: 15 * 60 * 1000,
    job: "leaderboard_rebuild",
  });
  scheduleRecurring({
    name: "analytics_aggregate",
    everyMs: 30 * 60 * 1000,
    job: "analytics_aggregate",
  });
}
