import { createContentUnit, listContentUnits } from "./units";

export async function createLearningNote(
  opts: {
    curriculumCode: string;
    subjectCode: string;
    topicName: string;
    conceptName?: string;
    title: string;
    body: string;
    releaseVersion?: string;
    tags?: string[];
  },
  actorUserId: string
) {
  return createContentUnit(
    {
      type: "learning_note",
      curriculumCode: opts.curriculumCode,
      subjectCode: opts.subjectCode,
      topicName: opts.topicName,
      conceptName: opts.conceptName,
      title: opts.title,
      body: opts.body,
      releaseVersion: opts.releaseVersion,
      tags: opts.tags,
    },
    actorUserId
  );
}

export async function listLearningNotes(filters: {
  curriculumCode?: string;
  subjectCode?: string;
  topicName?: string;
  releaseVersion?: string;
}) {
  const units = await listContentUnits({
    type: "learning_note",
    curriculumCode: filters.curriculumCode,
    subjectCode: filters.subjectCode,
    releaseVersion: filters.releaseVersion,
  });
  return filters.topicName
    ? units.filter((u) => u.topicName === filters.topicName)
    : units;
}
