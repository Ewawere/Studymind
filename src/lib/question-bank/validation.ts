/**
 * Validate question metadata before import or create.
 */

import type {
  QuestionInput,
  ValidationError,
  ValidationResult,
  QuestionType,
  BloomLevel,
} from "./types";

const VALID_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "SHORT_ANSWER",
  "ESSAY",
  "TRUE_FALSE",
  "PRACTICAL",
  "FLASHCARD",
];

const VALID_BLOOM: BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

export function validateQuestion(
  input: QuestionInput,
  row?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const at = (field: string, message: string) => {
    errors.push({ field, message, row });
  };
  const warn = (field: string, message: string) => {
    warnings.push({ field, message, row });
  };

  if (!input.curriculumCode?.trim()) {
    at("curriculumCode", "Curriculum is required");
  }
  if (!input.subjectCode?.trim()) {
    at("subjectCode", "Subject is required");
  }
  if (!input.stem?.trim()) {
    at("stem", "Question text is required");
  } else if (input.stem.trim().length < 10) {
    warn("stem", "Question text is very short");
  }

  const type = (input.type ?? "MULTIPLE_CHOICE") as QuestionType;
  if (!VALID_TYPES.includes(type)) {
    at("type", `Invalid type: ${type}`);
  }

  if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
    if (!input.options || input.options.length < 2) {
      at("options", "At least 2 options required for MCQ/True-False");
    } else {
      const keys = new Set<string>();
      for (const opt of input.options) {
        if (!opt.key?.trim()) at("options", "Option key is required");
        if (!opt.text?.trim()) at("options", `Option ${opt.key} has empty text`);
        if (keys.has(opt.key)) at("options", `Duplicate option key: ${opt.key}`);
        keys.add(opt.key);
      }
      if (!input.correctKey) {
        at("correctKey", "Correct answer key is required");
      } else if (!keys.has(input.correctKey)) {
        at("correctKey", `correctKey "${input.correctKey}" not in options`);
      }
    }
  }

  if (input.authorDifficulty != null) {
    if (
      !Number.isInteger(input.authorDifficulty) ||
      input.authorDifficulty < 1 ||
      input.authorDifficulty > 5
    ) {
      at("authorDifficulty", "Difficulty must be an integer 1–5");
    }
  }

  if (input.year != null) {
    const y = input.year;
    if (y < 1980 || y > new Date().getFullYear() + 1) {
      warn("year", `Unusual exam year: ${y}`);
    }
  }

  if (input.estimatedTimeSec != null && input.estimatedTimeSec <= 0) {
    at("estimatedTimeSec", "Estimated time must be positive");
  }

  if (input.bloomLevel) {
    const b = String(input.bloomLevel).toLowerCase() as BloomLevel;
    if (!VALID_BLOOM.includes(b)) {
      warn("bloomLevel", `Unknown Bloom level: ${input.bloomLevel}`);
    }
  }

  if (!input.explanation?.trim()) {
    warn("explanation", "Missing explanation — AI Tutor quality will be limited");
  }
  if (!input.learningObjectives?.length) {
    warn("learningObjectives", "No learning objectives provided");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Normalize stem for hashing / exact duplicate checks */
export function normalizeStem(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function hashStem(stem: string): string {
  // Simple stable hash (FNV-1a style) — good enough for exact match index
  const s = normalizeStem(stem);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
