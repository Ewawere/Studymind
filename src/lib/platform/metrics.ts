/**
 * Simple counters for ops visibility.
 */

const counters = new Map<string, number>();

export function inc(metric: string, by = 1): void {
  counters.set(metric, (counters.get(metric) ?? 0) + by);
}

export function getMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}

export function resetMetrics(): void {
  counters.clear();
}
