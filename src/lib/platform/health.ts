/**
 * Health / readiness / liveness probes for deploy platforms.
 */

import { prisma } from "@/lib/prisma";
import { cacheBackend } from "./cache";
import { storageConfigured } from "./storage";
import { queueDepth } from "./queue";
import { validateEnv } from "./config";
import { snapshotMetrics } from "./monitoring";

export interface HealthReport {
  status: "ok" | "degraded" | "down";
  checks: Record<
    string,
    { ok: boolean; detail?: string; latencyMs?: number }
  >;
  metrics?: ReturnType<typeof snapshotMetrics>;
  ts: string;
}

export async function liveness(): Promise<{ status: "ok" }> {
  return { status: "ok" };
}

export async function readiness(): Promise<HealthReport> {
  const checks: HealthReport["checks"] = {};

  // Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = {
      ok: false,
      detail: e instanceof Error ? e.message : "db error",
      latencyMs: Date.now() - dbStart,
    };
  }

  // Cache
  const backend = await cacheBackend();
  checks.cache = { ok: true, detail: backend };

  // Storage
  checks.storage = {
    ok: true,
    detail: storageConfigured() ? "s3" : "local_fallback",
  };

  // Queue
  checks.queue = { ok: true, detail: `depth=${queueDepth()}` };

  // Env
  const env = validateEnv();
  checks.env = {
    ok: env.ok,
    detail: env.issues.map((i) => i.key).join(",") || undefined,
  };

  const failed = Object.values(checks).filter((c) => !c.ok).length;
  const status =
    failed === 0 ? "ok" : checks.database?.ok === false ? "down" : "degraded";

  return {
    status,
    checks,
    metrics: snapshotMetrics(),
    ts: new Date().toISOString(),
  };
}

export async function health(): Promise<HealthReport> {
  return readiness();
}
