/**
 * Coverage dashboard — find gaps before publish.
 */

import { prisma } from "@/lib/prisma";
import { listContentUnits } from "./units";
import {
  WAEC_MATH_TOPIC_ORDER,
  WAEC_ENGLISH_TOPIC_ORDER,
} from "./templates";

export interface CoverageReport {
  curriculumCode: string;
  subjectCode: string;
  topicsTotal: number;
  topicsWithQuestions: number;
  conceptsTotal: number;
  conceptsWithFewQuestions: { conceptId: string; name: string; count: number }[];
  topicsMissingNotes: string[];
  topicsMissingExamples: string[];
  topicsMissingFormulas: string[];
  topicsMissingHardQuestions: string[];
  conceptsMissingObjectives: number;
  generatedAt: string;
}

export async function getCoverageReport(opts: {
  curriculumCode: string;
  subjectCode: string;
  minQuestionsPerConcept?: number;
}): Promise<CoverageReport> {
  const minQ = opts.minQuestionsPerConcept ?? 5;

  const curriculum = await prisma.curriculum.findFirst({
    where: { code: opts.curriculumCode },
  });
  if (!curriculum) {
    return emptyReport(opts.curriculumCode, opts.subjectCode);
  }

  const subject = await prisma.subject.findFirst({
    where: { curriculumId: curriculum.id, code: opts.subjectCode },
    include: {
      topics: {
        include: {
          concepts: true,
          questions: {
            select: {
              id: true,
              authorDifficulty: true,
              learningObjectives: true,
            },
          },
        },
      },
    },
  });

  if (!subject) {
    return emptyReport(opts.curriculumCode, opts.subjectCode);
  }

  const units = await listContentUnits({
    curriculumCode: opts.curriculumCode,
    subjectCode: opts.subjectCode,
    limit: 500,
  });

  const noteTopics = new Set(
    units.filter((u) => u.type === "learning_note").map((u) => u.topicName)
  );
  const exampleTopics = new Set(
    units.filter((u) => u.type === "worked_example").map((u) => u.topicName)
  );
  const formulaTopics = new Set(
    units
      .filter((u) => u.tags.includes("formula_sheet"))
      .map((u) => u.topicName)
  );

  const topicsMissingNotes: string[] = [];
  const topicsMissingExamples: string[] = [];
  const topicsMissingFormulas: string[] = [];
  const topicsMissingHardQuestions: string[] = [];
  const conceptsWithFewQuestions: CoverageReport["conceptsWithFewQuestions"] =
    [];
  let conceptsMissingObjectives = 0;
  let topicsWithQuestions = 0;
  let conceptsTotal = 0;

  for (const topic of subject.topics) {
    if (topic.questions.length > 0) topicsWithQuestions++;
    if (!noteTopics.has(topic.name)) topicsMissingNotes.push(topic.name);
    if (!exampleTopics.has(topic.name)) topicsMissingExamples.push(topic.name);
    if (!formulaTopics.has(topic.name)) topicsMissingFormulas.push(topic.name);

    const hasHard = topic.questions.some((q) => q.authorDifficulty >= 4);
    if (!hasHard && topic.questions.length > 0) {
      topicsMissingHardQuestions.push(topic.name);
    }

    for (const c of topic.concepts) {
      conceptsTotal++;
      const count = topic.questions.filter((q) => true).length; // topic-level approx
      // Prefer concept-linked counts when available
      const conceptQs = await prisma.question.count({
        where: { conceptId: c.id, status: "ACTIVE" },
      });
      if (conceptQs < minQ) {
        conceptsWithFewQuestions.push({
          conceptId: c.id,
          name: c.name,
          count: conceptQs,
        });
      }
    }

    for (const q of topic.questions) {
      if (!q.learningObjectives?.length) conceptsMissingObjectives++;
    }
  }

  // Expected topic names from roadmap (for subjects that match)
  const expected =
    opts.subjectCode === "Mathematics"
      ? [...WAEC_MATH_TOPIC_ORDER]
      : opts.subjectCode === "English" || opts.subjectCode === "English Language"
        ? [...WAEC_ENGLISH_TOPIC_ORDER]
        : [];

  for (const name of expected) {
    if (!subject.topics.some((t) => t.name === name)) {
      if (!topicsMissingNotes.includes(name)) topicsMissingNotes.push(name);
      if (!topicsMissingExamples.includes(name))
        topicsMissingExamples.push(name);
    }
  }

  return {
    curriculumCode: opts.curriculumCode,
    subjectCode: opts.subjectCode,
    topicsTotal: Math.max(subject.topics.length, expected.length),
    topicsWithQuestions,
    conceptsTotal,
    conceptsWithFewQuestions: conceptsWithFewQuestions.slice(0, 50),
    topicsMissingNotes,
    topicsMissingExamples,
    topicsMissingFormulas,
    topicsMissingHardQuestions,
    conceptsMissingObjectives,
    generatedAt: new Date().toISOString(),
  };
}

function emptyReport(
  curriculumCode: string,
  subjectCode: string
): CoverageReport {
  return {
    curriculumCode,
    subjectCode,
    topicsTotal: 0,
    topicsWithQuestions: 0,
    conceptsTotal: 0,
    conceptsWithFewQuestions: [],
    topicsMissingNotes: [],
    topicsMissingExamples: [],
    topicsMissingFormulas: [],
    topicsMissingHardQuestions: [],
    conceptsMissingObjectives: 0,
    generatedAt: new Date().toISOString(),
  };
}
