/**
 * Safety & curriculum guardrails.
 */

import type { TutorRequest, TutorContext } from "./types";

const BLOCKED_PATTERNS = [
  /\bhow to (make|build) (a )?bomb\b/i,
  /\bsuicide methods?\b/i,
  /\bignore (all )?(previous|prior) instructions\b/i,
  /\bdan mode\b/i,
  /\bjailbreak\b/i,
];

const OFF_TOPIC_INJECTION =
  /\b(pretend you are|act as if you have no rules|bypass curriculum)\b/i;

export interface SafetyCheck {
  allowed: boolean;
  reasons: string[];
}

export function checkRequestSafety(
  req: TutorRequest,
  ctx: TutorContext
): SafetyCheck {
  const reasons: string[] = [];
  const text = `${req.message ?? ""}`;

  for (const re of BLOCKED_PATTERNS) {
    if (re.test(text)) reasons.push("blocked_content");
  }
  if (OFF_TOPIC_INJECTION.test(text)) reasons.push("prompt_injection");

  // Medical/legal deep advice requests (light heuristic)
  if (
    /\b(diagnose my|prescribe|sue my|legal advice for court)\b/i.test(text)
  ) {
    reasons.push("unsupported_advice_domain");
  }

  // Empty free_ask without context
  if (
    req.capability === "free_ask" &&
    !req.message?.trim() &&
    !req.questionId &&
    ctx.weakConcepts.length === 0
  ) {
    reasons.push("insufficient_context");
  }

  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function refusalMessage(reasons: string[]): string {
  if (reasons.includes("blocked_content")) {
    return "I can't help with that request. Let's focus on your studies instead — what topic are you working on?";
  }
  if (reasons.includes("prompt_injection")) {
    return "I'll stick to helping you learn within your curriculum. What concept should we tackle?";
  }
  if (reasons.includes("unsupported_advice_domain")) {
    return "I'm your study tutor for school exams, not a doctor or lawyer. Ask me about a subject topic!";
  }
  return "I need a bit more context — share a question, topic, or what you're stuck on.";
}
