/**
 * Content pipeline + versioned releases
 */

export type ContentReleaseStatus =
  | "draft"
  | "qa"
  | "published"
  | "deprecated"
  | "rolled_back";

export interface ContentReleasePlan {
  version: string; // e.g. "1.0.0"
  codename?: string;
  curriculumCodes: string[];
  subjectCodes: string[];
  notes?: string;
}

export interface ContentReleaseSummary {
  id: string;
  version: string;
  status: ContentReleaseStatus;
  curriculumCodes: string[];
  subjectCodes: string[];
  questionCount: number;
  noteCount: number;
  exampleCount: number;
  publishedAt?: string;
  createdAt: string;
}

export type ContentUnitType =
  | "learning_note"
  | "worked_example"
  | "summary"
  | "misconception_guide";

export interface ContentUnitInput {
  type: ContentUnitType;
  curriculumCode: string;
  subjectCode: string;
  topicName?: string;
  conceptName?: string;
  title: string;
  body: string; // markdown
  difficulty?: number;
  bloomLevel?: string;
  tags?: string[];
  relatedQuestionIds?: string[];
  releaseVersion?: string;
}

/** Roadmap of planned content versions */
export const CONTENT_ROADMAP = [
  {
    version: "1.0.0",
    label: "WAEC Core Literacy & Numeracy",
    subjects: ["WAEC:Mathematics", "WAEC:English"],
  },
  {
    version: "1.1.0",
    label: "WAEC Physical Sciences",
    subjects: ["WAEC:Physics", "WAEC:Chemistry"],
  },
  {
    version: "1.2.0",
    label: "WAEC Biology",
    subjects: ["WAEC:Biology"],
  },
  {
    version: "2.0.0",
    label: "JAMB Core",
    subjects: ["JAMB:Mathematics", "JAMB:English", "JAMB:Physics", "JAMB:Chemistry", "JAMB:Biology"],
  },
  {
    version: "3.0.0",
    label: "University Year 1",
    subjects: [],
  },
  {
    version: "4.0.0",
    label: "Cambridge IGCSE",
    subjects: [],
  },
  {
    version: "5.0.0",
    label: "SAT / GRE",
    subjects: [],
  },
] as const;

/** Performance SLOs (Phase 3) */
export const PERFORMANCE_TARGETS = {
  dashboardMs: 500,
  questionSearchMs: 150,
  nextQuestionSelectionMs: 100,
  aiContextBuildMs: 100,
  practiceAnswerProcessingMs: 250, // excluding LLM
  questionImportPerHour: 10_000,
  concurrentUsersInitial: 1_000,
} as const;
