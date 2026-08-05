/**
 * Lightweight job registry for admin visibility.
 * Swap for BullMQ/Inngest in Module 10.
 */

import type { AdminActor, JobStatus } from "./types";
import { assertPermission } from "./auth";
import { writeAudit } from "./audit";

const jobs = new Map<string, JobStatus>();

function id() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listJobs(actor: AdminActor): JobStatus[] {
  assertPermission(actor, "jobs.manage");
  return [...jobs.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export async function enqueueJob(
  actor: AdminActor,
  type: string,
  runner: (update: (p: Partial<JobStatus>) => void) => Promise<void>
): Promise<JobStatus> {
  assertPermission(actor, "jobs.manage");
  const job: JobStatus = {
    id: id(),
    type,
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  await writeAudit(actor, "job.enqueue", "Job", job.id, { type });

  // fire-and-forget
  void (async () => {
    job.status = "running";
    try {
      await runner((patch) => {
        Object.assign(job, patch);
      });
      job.status = "completed";
      job.progress = 100;
      job.finishedAt = new Date().toISOString();
    } catch (e) {
      job.status = "failed";
      job.message = e instanceof Error ? e.message : "Job failed";
      job.finishedAt = new Date().toISOString();
    }
  })();

  return job;
}

export async function runDifficultyRecalibrationJob(
  actor: AdminActor,
  recalibrateFn: () => Promise<number>
) {
  return enqueueJob(actor, "difficulty_recalibration", async (update) => {
    update({ message: "Recalibrating difficulties…", progress: 10 });
    const n = await recalibrateFn();
    update({ message: `Updated ${n} questions`, progress: 100 });
  });
}
