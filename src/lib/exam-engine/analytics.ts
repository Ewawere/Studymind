/**
 * Post-exam analytics report.
 */

import { prisma } from "@/lib/prisma";
import { summarizeScore } from "@/lib/assessment";
import type { MarkedAnswer } from "@/lib/assessment";
import type { ExamMode, ExamReport } from "./types";
import { elapsedSeconds } from "./timer";

export async function buildExamReport(opts: {
  examId: string;
  mode: ExamMode;
  startedAt: Date;
  marked: MarkedAnswer[];
  integrityEventCount: number;
}): Promise<ExamReport> {
  const correct = opts.marked.filter((m) => m.isCorrect).length;
  const skipped = opts.marked.filter((m) => m.selectedKey == null).length;
  const incorrect = opts.marked.length - correct - skipped;

  const summary = summarizeScore({
    totalQuestions: opts.marked.length,
    correct,
    incorrect,
    skipped,
  });

  const times = opts.marked
    .map((m) => m.timeSpentMs)
    .filter((t): t is number => t != null);
  const averageResponseMs =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

  // Subject / topic / concept breakdowns
  const subjectMap = new Map<
    string,
    { correct: number; total: number; name?: string }
  >();
  const topicMap = new Map<
    string,
    { correct: number; total: number; name?: string }
  >();
  const conceptMap = new Map<
    string,
    { correct: number; total: number; name?: string }
  >();

  for (const m of opts.marked) {
    if (m.selectedKey == null) continue;
    const s = subjectMap.get(m.subjectId) ?? { correct: 0, total: 0 };
    s.total++;
    if (m.isCorrect) s.correct++;
    subjectMap.set(m.subjectId, s);

    if (m.topicId) {
      const t = topicMap.get(m.topicId) ?? { correct: 0, total: 0 };
      t.total++;
      if (m.isCorrect) t.correct++;
      topicMap.set(m.topicId, t);
    }
    if (m.conceptId) {
      const c = conceptMap.get(m.conceptId) ?? { correct: 0, total: 0 };
      c.total++;
      if (m.isCorrect) c.correct++;
      conceptMap.set(m.conceptId, c);
    }
  }

  // Resolve names
  const subjectIds = [...subjectMap.keys()];
  const topicIds = [...topicMap.keys()];
  const conceptIds = [...conceptMap.keys()];

  const [subjects, topics, concepts] = await Promise.all([
    subjectIds.length
      ? prisma.subject.findMany({ where: { id: { in: subjectIds } } })
      : [],
    topicIds.length
      ? prisma.topic.findMany({ where: { id: { in: topicIds } } })
      : [],
    conceptIds.length
      ? prisma.concept.findMany({ where: { id: { in: conceptIds } } })
      : [],
  ]);

  for (const s of subjects) {
    const e = subjectMap.get(s.id);
    if (e) e.name = s.name;
  }
  for (const t of topics) {
    const e = topicMap.get(t.id);
    if (e) e.name = t.name;
  }
  for (const c of concepts) {
    const e = conceptMap.get(c.id);
    if (e) e.name = c.name;
  }

  const subjectBreakdown = [...subjectMap.entries()].map(([subjectId, v]) => ({
    subjectId,
    name: v.name,
    correct: v.correct,
    total: v.total,
    accuracy: v.total ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
  }));

  const topicBreakdown = [...topicMap.entries()].map(([topicId, v]) => ({
    topicId,
    name: v.name,
    correct: v.correct,
    total: v.total,
    accuracy: v.total ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
  }));

  const conceptStats = [...conceptMap.entries()].map(([conceptId, v]) => ({
    conceptId,
    name: v.name,
    accuracy: v.total ? v.correct / v.total : 0,
    total: v.total,
  }));

  const weakConcepts = conceptStats
    .filter((c) => c.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map((c) => ({
      conceptId: c.conceptId,
      name: c.name,
      accuracy: Math.round(c.accuracy * 1000) / 10,
    }));

  const strongConcepts = conceptStats
    .filter((c) => c.total > 0)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)
    .map((c) => ({
      conceptId: c.conceptId,
      name: c.name,
      accuracy: Math.round(c.accuracy * 1000) / 10,
    }));

  return {
    examId: opts.examId,
    mode: opts.mode,
    summary,
    timeSpentSec: elapsedSeconds(opts.startedAt),
    averageResponseMs,
    subjectBreakdown,
    topicBreakdown,
    weakConcepts,
    strongConcepts,
    incorrectQuestionIds: opts.marked
      .filter((m) => m.selectedKey != null && !m.isCorrect)
      .map((m) => m.questionId),
    skippedQuestionIds: opts.marked
      .filter((m) => m.selectedKey == null)
      .map((m) => m.questionId),
    recommendedRevision: weakConcepts.map((c) => c.name).filter(Boolean) as string[],
    recommendedPractice: weakConcepts.map((c) => c.name).filter(Boolean) as string[],
    integrityEventCount: opts.integrityEventCount,
  };
}
