import { createContentUnit, listContentUnits } from "./units";

export async function createWorkedExample(
  opts: {
    curriculumCode: string;
    subjectCode: string;
    topicName: string;
    conceptName?: string;
    title: string;
    body: string;
    difficulty?: number;
    releaseVersion?: string;
    relatedQuestionIds?: string[];
  },
  actorUserId: string
) {
  return createContentUnit(
    {
      type: "worked_example",
      curriculumCode: opts.curriculumCode,
      subjectCode: opts.subjectCode,
      topicName: opts.topicName,
      conceptName: opts.conceptName,
      title: opts.title,
      body: opts.body,
      difficulty: opts.difficulty,
      releaseVersion: opts.releaseVersion,
      relatedQuestionIds: opts.relatedQuestionIds,
    },
    actorUserId
  );
}

export async function listWorkedExamples(filters: {
  curriculumCode?: string;
  subjectCode?: string;
  topicName?: string;
  releaseVersion?: string;
}) {
  const units = await listContentUnits({
    type: "worked_example",
    curriculumCode: filters.curriculumCode,
    subjectCode: filters.subjectCode,
    releaseVersion: filters.releaseVersion,
  });
  return filters.topicName
    ? units.filter((u) => u.topicName === filters.topicName)
    : units;
}
