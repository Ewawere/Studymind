/**
 * StudyMind Question Bank — shared types
 * Curriculum-agnostic. Supports WAEC, JAMB, NECO, Cambridge, SAT, GRE, university.
 */

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "TRUE_FALSE"
  | "PRACTICAL"
  | "FLASHCARD";

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export interface QuestionOptionInput {
  key: string;
  text: string;
  isCorrect?: boolean;
}

export interface CommonMistakeInput {
  mistake: string;
  why?: string;
}

export interface MediaInput {
  type: "image" | "diagram" | "equation" | "audio" | "video" | "table";
  url: string;
  altText?: string;
  order?: number;
  metadata?: Record<string, unknown>;
}

/** Canonical shape for a question being imported or validated */
export interface QuestionInput {
  curriculumCode: string;
  subjectCode: string;
  topicName?: string;
  conceptName?: string;
  conceptNames?: string[]; // multi-concept mapping
  type?: QuestionType;
  language?: string;
  stem: string;
  options?: QuestionOptionInput[];
  correctKey?: string;
  authorDifficulty?: number; // 1–5
  explanation?: string;
  commonMistakes?: CommonMistakeInput[];
  learningObjectives?: string[];
  estimatedTimeSec?: number;
  source?: string;
  year?: number;
  bloomLevel?: BloomLevel | string;
  tags?: string[];
  keywords?: string[];
  media?: MediaInput[];
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DuplicateMatch {
  existingQuestionId: string;
  similarity: number; // 0–1
  reason: string;
}

export interface ImportRowResult {
  row: number;
  status: "imported" | "skipped" | "duplicate" | "error";
  questionId?: string;
  errors?: ValidationError[];
  duplicates?: DuplicateMatch[];
  warnings?: ValidationError[];
}

export interface ImportReport {
  importId: string;
  sourceFormat: "csv" | "json";
  fileName?: string;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ImportRowResult[];
  warnings: ValidationError[];
}

export interface SearchFilters {
  query?: string;
  curriculumId?: string;
  curriculumCode?: string;
  subjectId?: string;
  subjectCode?: string;
  topicId?: string;
  conceptId?: string;
  difficultyMin?: number;
  difficultyMax?: number;
  year?: number;
  yearMin?: number;
  yearMax?: number;
  tags?: string[];
  estimatedTimeMaxSec?: number;
  source?: string;
  language?: string;
  type?: QuestionType;
  status?: "ACTIVE" | "ARCHIVED" | "DRAFT";
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: QuestionSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QuestionSummary {
  id: string;
  stem: string;
  type: string;
  authorDifficulty: number;
  calculatedDifficulty: number | null;
  year: number | null;
  source: string | null;
  subjectId: string;
  topicId: string | null;
  conceptId: string | null;
  tags: string[];
  estimatedTimeSec: number | null;
}

/** Structured context for the AI Tutor */
export interface QuestionAIContext {
  id: string;
  stem: string;
  type: string;
  options: { key: string; text: string }[];
  correctKey: string | null;
  explanation: string | null;
  learningObjectives: string[];
  commonMistakes: CommonMistakeInput[];
  difficulty: number;
  calculatedDifficulty: number | null;
  tags: string[];
  keywords: string[];
  concepts: { id: string; name: string; role: string }[];
  prerequisites: { id: string; name: string }[];
  relatedConcepts: { id: string; name: string }[];
  estimatedTimeSec: number | null;
  source: string | null;
  year: number | null;
  bloomLevel: string | null;
}

export interface DuplicateDetectionOptions {
  /** 0–1, default 0.92 for near-identical stem */
  stemSimilarityThreshold?: number;
  checkOptions?: boolean;
  checkExplanation?: boolean;
  checkConcept?: boolean;
}
