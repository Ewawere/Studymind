import { createContentUnit, listContentUnits } from "./units";

/**
 * Formula sheets stored as learning_note with tag "formula_sheet".
 * Dedicated type can be added when schema expands.
 */
export async function createFormulaSheet(
  opts: {
    curriculumCode: string;
    subjectCode: string;
    topicName: string;
    title: string;
    body: string; // markdown list of formulas
    releaseVersion?: string;
  },
  actorUserId: string
) {
  return createContentUnit(
    {
      type: "learning_note",
      curriculumCode: opts.curriculumCode,
      subjectCode: opts.subjectCode,
      topicName: opts.topicName,
      title: opts.title,
      body: opts.body,
      releaseVersion: opts.releaseVersion,
      tags: ["formula_sheet"],
    },
    actorUserId
  );
}

export async function listFormulaSheets(filters: {
  curriculumCode?: string;
  subjectCode?: string;
  topicName?: string;
}) {
  const notes = await listContentUnits({
    type: "learning_note",
    curriculumCode: filters.curriculumCode,
    subjectCode: filters.subjectCode,
  });
  return notes.filter(
    (n) =>
      n.tags.includes("formula_sheet") &&
      (!filters.topicName || n.topicName === filters.topicName)
  );
}
