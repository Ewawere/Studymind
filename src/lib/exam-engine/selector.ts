/**
 * Fixed question selection for exams.
 * Queue is frozen once the exam starts.
 */

import { prisma } from "@/lib/prisma";
import type { ExamConfig, SelectionStrategy } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function selectExamQuestions(
  config: ExamConfig
): Promise<string[]> {
  if (config.selection === "manual" && config.questionIds?.length) {
    return config.rules?.shuffleQuestions !== false
      ? shuffle(config.questionIds)
      : [...config.questionIds];
  }

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    isActive: true,
  };
  if (config.subjectIds?.length) where.subjectId = { in: config.subjectIds };
  if (config.topicIds?.length) where.topicId = { in: config.topicIds };
  if (config.conceptIds?.length) where.conceptId = { in: config.conceptIds };
  if (config.difficultyMin || config.difficultyMax) {
    where.authorDifficulty = {
      ...(config.difficultyMin ? { gte: config.difficultyMin } : {}),
      ...(config.difficultyMax ? { lte: config.difficultyMax } : {}),
    };
  }

  const pool = await prisma.question.findMany({
    where,
    select: {
      id: true,
      topicId: true,
      authorDifficulty: true,
      calculatedDifficulty: true,
    },
    take: 2000,
  });

  if (pool.length === 0) {
    throw new Error("No questions available for exam configuration");
  }

  const count = Math.min(config.questionCount, pool.length);
  const strategy: SelectionStrategy = config.selection ?? "random";

  let selected: string[];

  if (strategy === "difficulty_balanced") {
    selected = balanceByDifficulty(pool, count);
  } else if (strategy === "topic_balanced" || strategy === "blueprint") {
    selected = balanceByTopic(pool, count);
  } else {
    selected = shuffle(pool).slice(0, count).map((q) => q.id);
  }

  return config.rules?.shuffleQuestions === false ? selected : shuffle(selected);
}

function balanceByDifficulty(
  pool: { id: string; authorDifficulty: number; calculatedDifficulty: number | null }[],
  count: number
): string[] {
  const buckets = new Map<number, string[]>();
  for (const q of pool) {
    const d = Math.round(q.calculatedDifficulty ?? q.authorDifficulty);
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d)!.push(q.id);
  }
  for (const [k, ids] of buckets) buckets.set(k, shuffle(ids));

  const out: string[] = [];
  const difficulties = [...buckets.keys()].sort();
  let i = 0;
  while (out.length < count && difficulties.some((d) => (buckets.get(d)?.length ?? 0) > 0)) {
    const d = difficulties[i % difficulties.length];
    const list = buckets.get(d)!;
    if (list.length) out.push(list.pop()!);
    i++;
  }
  return out;
}

function balanceByTopic(
  pool: { id: string; topicId: string | null }[],
  count: number
): string[] {
  const buckets = new Map<string, string[]>();
  for (const q of pool) {
    const t = q.topicId ?? "_";
    if (!buckets.has(t)) buckets.set(t, []);
    buckets.get(t)!.push(q.id);
  }
  for (const [k, ids] of buckets) buckets.set(k, shuffle(ids));

  const out: string[] = [];
  const keys = [...buckets.keys()];
  let i = 0;
  while (out.length < count && keys.some((k) => (buckets.get(k)?.length ?? 0) > 0)) {
    const k = keys[i % keys.length];
    const list = buckets.get(k)!;
    if (list.length) out.push(list.pop()!);
    i++;
  }
  return out;
}
