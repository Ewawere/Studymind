/**
 * Validate AI output and extract structured fields.
 */

import type {
  TutorStructuredResponse,
  TutorCapability,
  ExplanationStyle,
  ValidationResult,
} from "./types";

export function validateAndSanitize(raw: string): ValidationResult {
  const issues: string[] = [];
  let sanitized = raw.trim();

  if (!sanitized) {
    issues.push("empty_response");
    return { ok: false, issues, sanitized: "I couldn't generate a response. Please try again." };
  }

  // Strip obvious leaked system prompts
  if (/you are studymind ai tutor/i.test(sanitized) && sanitized.length < 80) {
    issues.push("system_leak");
  }

  // Cap extreme length for mobile UX
  if (sanitized.length > 8000) {
    sanitized = sanitized.slice(0, 8000) + "\n\n[Response truncated]";
    issues.push("truncated");
  }

  return { ok: issues.filter((i) => i !== "truncated").length === 0, issues, sanitized };
}

function extractLabel(text: string, label: string): string | null {
  const re = new RegExp(`${label}:\\s*(.+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

export function parseStructuredResponse(
  raw: string,
  meta: {
    style: ExplanationStyle;
    capability: TutorCapability;
    model?: string;
    tokensUsed?: number;
  }
): TutorStructuredResponse {
  const { sanitized } = validateAndSanitize(raw);

  const misconception = extractLabel(sanitized, "MISCONCEPTION");
  const followUpQuestion = extractLabel(sanitized, "FOLLOW_UP");
  const recommendedPractice = extractLabel(sanitized, "PRACTICE");
  const recommendedRevision = extractLabel(sanitized, "REVISION");

  // Main explanation = body before labeled sections
  let explanation = sanitized;
  for (const label of ["MISCONCEPTION", "FOLLOW_UP", "PRACTICE", "REVISION"]) {
    const idx = explanation.search(new RegExp(`\\n?${label}:`, "i"));
    if (idx > 0) explanation = explanation.slice(0, idx).trim();
  }

  const nextActions: string[] = [];
  if (recommendedPractice) nextActions.push("practice");
  if (recommendedRevision) nextActions.push("revise");
  if (followUpQuestion) nextActions.push("answer_follow_up");

  // Heuristic confidence
  let confidence = 0.75;
  if (explanation.length < 40) confidence = 0.4;
  if (misconception || recommendedPractice) confidence = Math.min(0.95, confidence + 0.1);

  return {
    explanation: explanation || null,
    hint: meta.capability === "generate_hint" ? explanation : null,
    misconception,
    confidence,
    recommendedPractice,
    recommendedRevision,
    followUpQuestion,
    suggestedDifficulty: null,
    nextActions,
    message: sanitized,
    style: meta.style,
    capability: meta.capability,
    model: meta.model,
    tokensUsed: meta.tokensUsed,
  };
}
