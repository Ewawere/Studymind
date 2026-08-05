/**
 * Metrics + error tracking hooks.
 * Prometheus-style counters/histograms in-process; wire OTEL later.
 */

import { platformConfig } from "./config";
import { log } from "./logging";
import { inc, getMetrics } from "./metrics";

const timings = new Map<string, number[]>();

export function observeLatency(metric: string, ms: number) {
  const arr = timings.get(metric) ?? [];
  arr.push(ms);
  if (arr.length > 500) arr.shift();
  timings.set(metric, arr);
  inc(`${metric}.count`);
}

export function latencyStats(metric: string) {
  const arr = timings.get(metric) ?? [];
  if (!arr.length) return { count: 0, p50: 0, p95: 0, avg: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    count: arr.length,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    avg: Math.round(avg),
  };
}

export async function timed<T>(
  metric: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    observeLatency(metric, Date.now() - start);
  }
}

export async function captureException(
  err: unknown,
  context?: Record<string, unknown>
) {
  const message = err instanceof Error ? err.message : String(err);
  log.error("exception", {
    message,
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
  });
  inc("errors.total");

  if (platformConfig.sentryDsn) {
    // Optional Sentry — no hard dependency
    try {
      const Sentry = await import("@sentry/node").catch(() => null);
      if (Sentry) {
        Sentry.captureException(err, { extra: context });
      }
    } catch {
      /* ignore */
    }
  }
}

export function snapshotMetrics() {
  const latency: Record<string, ReturnType<typeof latencyStats>> = {};
  for (const key of timings.keys()) {
    latency[key] = latencyStats(key);
  }
  return {
    counters: getMetrics(),
    latency,
  };
}
