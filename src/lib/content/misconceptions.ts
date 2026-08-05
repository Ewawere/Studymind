import { createContentUnit, listContentUnits } from "./units";

export async function createMisconceptionGuide(
  opts: {
    curriculumCode: string;
    subjectCode: string;
    topicName: string;
    conceptName?: string;
    title: string;
    body: string;
    releaseVersion?: string;
  },
  actorUserId: string
) {
  return createContentUnit(
    {
      type: "misconception_guide",
      curriculumCode: opts.curriculumCode,
      subjectCode: opts.subjectCode,
      topicName: opts.topicName,
      conceptName: opts.conceptName,
      title: opts.title,
      body: opts.body,
      releaseVersion: opts.releaseVersion,
      tags: ["misconception"],
    },
    actorUserId
  );
}

export async function listMisconceptions(filters: {
  curriculumCode?: string;
  subjectCode?: string;
  topicName?: string;
  conceptName?: string;
}) {
  const units = await listContentUnits({
    type: "misconception_guide",
    curriculumCode: filters.curriculumCode,
    subjectCode: filters.subjectCode,
    conceptName: filters.conceptName,
  });
  return filters.topicName
    ? units.filter((u) => u.topicName === filters.topicName)
    : units;
}
