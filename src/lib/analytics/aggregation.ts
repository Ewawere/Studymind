/**
 * Shared aggregation helpers — pure functions over attempt rows.
 */

export interface AttemptRow {
  isCorrect: boolean;
  skipped?: boolean;
  timeSpentMs?: number | null;
  createdAt: Date;
  subjectId?: string | null;
  topicId?: string | null;
  conceptId?: string | null;
  difficulty?: number | null;
}

export function accuracyOf(rows: { isCorrect: boolean }[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.isCorrect).length / rows.length;
}

export function averageMs(rows: { timeSpentMs?: number | null }[]): number | null {
  const times = rows
    .map((r) => r.timeSpentMs)
    .filter((t): t is number => t != null);
  if (!times.length) return null;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export function groupBy<T>(
  rows: T[],
  keyFn: (r: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

export function dailyBuckets(
  rows: AttemptRow[],
  days: number
): { date: string; questions: number; correct: number; minutes: number }[] {
  const out: {
    date: string;
    questions: number;
    correct: number;
    minutes: number;
  }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRows = rows.filter(
      (r) => r.createdAt.toISOString().slice(0, 10) === key
    );
    const ms = dayRows.reduce((s, r) => s + (r.timeSpentMs ?? 0), 0);
    out.push({
      date: key,
      questions: dayRows.length,
      correct: dayRows.filter((r) => r.isCorrect).length,
      minutes: Math.round(ms / 60000),
    });
  }
  return out;
}

/** Compare last 7 days accuracy vs previous 7 days */
export function improvementRate(rows: AttemptRow[]): number | null {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const recent = rows.filter((r) => now - r.createdAt.getTime() <= week);
  const prior = rows.filter(
    (r) =>
      now - r.createdAt.getTime() > week &&
      now - r.createdAt.getTime() <= 2 * week
  );
  if (recent.length < 5 || prior.length < 5) return null;
  return accuracyOf(recent) - accuracyOf(prior);
}
