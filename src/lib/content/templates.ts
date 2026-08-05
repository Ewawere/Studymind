/**
 * Authoring templates + recommended topic order for Content v1.0
 */

export const QUESTION_JSON_TEMPLATE = {
  curriculum: "WAEC",
  subject: "Mathematics",
  topic: "",
  concepts: [] as string[],
  learningObjective: "",
  difficulty: "medium" as "easy" | "medium" | "hard",
  authorDifficulty: 3,
  bloomLevel: "apply",
  estimatedTimeSec: 90,
  stem: "",
  options: [
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" },
  ],
  correctAnswer: "",
  stepByStepExplanation: "",
  commonMisconception: "",
  prerequisites: [] as string[],
  relatedQuestions: [] as string[],
  tags: [] as string[],
  aiTutorContext: "",
  pastExam: {
    year: null as number | null,
    paper: "",
    number: null as number | null,
  },
};

export type QuestionAuthoringPayload = typeof QUESTION_JSON_TEMPLATE;

export const WAEC_MATH_TOPIC_ORDER = [
  "Numbers & Numeration",
  "Algebraic Processes",
  "Indices & Surds",
  "Logarithms",
  "Variation",
  "Functions",
  "Equations & Inequalities",
  "Sequences & Series",
  "Coordinate Geometry",
  "Trigonometry",
  "Mensuration",
  "Geometry",
  "Statistics",
  "Probability",
  "Calculus",
] as const;

export const WAEC_ENGLISH_TOPIC_ORDER = [
  "Lexis & Structure",
  "Vocabulary",
  "Concord",
  "Tenses",
  "Parts of Speech",
  "Comprehension",
  "Summary",
  "Oral English",
  "Registers",
  "Idioms",
  "Figures of Speech",
  "Essay Writing",
] as const;

/** Map authoring difficulty label → 1–5 scale */
export function difficultyToNumber(
  d: "easy" | "medium" | "hard" | number
): number {
  if (typeof d === "number") return Math.min(5, Math.max(1, d));
  if (d === "easy") return 2;
  if (d === "hard") return 4;
  return 3;
}

/** Convert authoring payload → Question Bank import shape */
export function toImportRow(q: QuestionAuthoringPayload) {
  return {
    curriculumCode: q.curriculum,
    subjectCode: q.subject === "English Language" ? "English" : q.subject,
    topicName: q.topic,
    conceptName: q.concepts[0],
    stem: q.stem,
    options: q.options.map((o) => ({
      key: o.key,
      text: o.text,
      isCorrect: o.key === q.correctAnswer,
    })),
    correctKey: q.correctAnswer,
    explanation: q.stepByStepExplanation,
    commonMistakes: q.commonMisconception
      ? [q.commonMisconception]
      : undefined,
    learningObjectives: q.learningObjective ? [q.learningObjective] : [],
    authorDifficulty: difficultyToNumber(q.authorDifficulty ?? q.difficulty),
    estimatedTimeSec: q.estimatedTimeSec,
    bloomLevel: q.bloomLevel,
    tags: q.tags,
    keywords: q.concepts,
    source: q.pastExam?.year
      ? `WAEC ${q.pastExam.year}${q.pastExam.paper ? " " + q.pastExam.paper : ""}`
      : "StudyMind original",
    year: q.pastExam?.year ?? undefined,
  };
}
