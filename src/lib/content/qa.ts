/**
 * Content QA — every question must pass before publish.
 */

import type { QuestionAuthoringPayload } from "./templates";

export interface QaIssue {
  field: string;
  message: string;
  level: "error" | "warn";
}

export interface QaResult {
  ok: boolean;
  errors: QaIssue[];
  warnings: QaIssue[];
}

export function validateQuestionAuthoring(
  q: Partial<QuestionAuthoringPayload>
): QaResult {
  const errors: QaIssue[] = [];
  const warnings: QaIssue[] = [];

  const req = (field: string, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message, level: "error" });
  };
  const warn = (field: string, ok: boolean, message: string) => {
    if (!ok) warnings.push({ field, message, level: "warn" });
  };

  req("curriculum", !!q.curriculum, "Curriculum is required");
  req("subject", !!q.subject, "Subject is required");
  req("topic", !!q.topic?.trim(), "Topic is required");
  req(
    "concepts",
    Array.isArray(q.concepts) && q.concepts.length > 0,
    "At least one concept is required"
  );
  req(
    "learningObjective",
    !!q.learningObjective?.trim(),
    "Learning objective is required"
  );
  req("stem", !!q.stem?.trim() && q.stem.trim().length >= 10, "Stem too short");
  req(
    "options",
    Array.isArray(q.options) && q.options.length >= 2,
    "At least 2 options required"
  );
  req("correctAnswer", !!q.correctAnswer, "Correct answer is required");
  if (q.options && q.correctAnswer) {
    req(
      "correctAnswer",
      q.options.some((o) => o.key === q.correctAnswer),
      "Correct answer must match an option key"
    );
  }
  req(
    "stepByStepExplanation",
    !!q.stepByStepExplanation?.trim() &&
      q.stepByStepExplanation.trim().length >= 20,
    "Step-by-step explanation required"
  );
  req(
    "commonMisconception",
    !!q.commonMisconception?.trim(),
    "Common misconception required"
  );
  req("bloomLevel", !!q.bloomLevel, "Bloom level required");
  req(
    "estimatedTimeSec",
    typeof q.estimatedTimeSec === "number" && q.estimatedTimeSec > 0,
    "Estimated time required"
  );

  warn(
    "aiTutorContext",
    !!q.aiTutorContext?.trim(),
    "AI Tutor context recommended"
  );
  warn(
    "prerequisites",
    Array.isArray(q.prerequisites) && q.prerequisites.length > 0,
    "Prerequisites recommended"
  );
  warn(
    "tags",
    Array.isArray(q.tags) && q.tags.length > 0,
    "Tags recommended"
  );

  if (q.options) {
    for (const o of q.options) {
      if (!o.text?.trim()) {
        errors.push({
          field: "options",
          message: `Option ${o.key} is empty`,
          level: "error",
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export const QA_CHECKLIST = [
  "Correct curriculum",
  "Correct subject",
  "Correct topic",
  "Correct concept mapping",
  "Learning objective attached",
  "Correct answer verified",
  "Explanation completed",
  "Step-by-step solution completed",
  "Common misconception included",
  "Bloom level assigned",
  "Difficulty reviewed",
  "Estimated time assigned",
  "Grammar checked",
  "Duplicate check passed",
  "AI Tutor context generated",
  "Related questions linked",
  "Metadata complete",
] as const;
