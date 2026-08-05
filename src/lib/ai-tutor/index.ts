/**
 * StudyMind AI Tutor — public API
 *
 * @example
 * import { createDefaultProvider, setTutorProvider, runTutor } from "@/lib/ai-tutor";
 *
 * setTutorProvider(createDefaultProvider());
 * const res = await runTutor({
 *   userId,
 *   capability: "explain_wrong_answer",
 *   questionId,
 *   selectedKey: "C",
 *   style: "football_analogies",
 * });
 */

export * from "./types";
export { buildTutorContext } from "./context";
export { buildMessages, buildSystemPrompt, buildUserPrompt } from "./prompts";
export { runTutor, streamTutor } from "./orchestrator";
export {
  getOrCreateConversation,
  appendMessage,
} from "./conversation";
export { EXPLANATION_STYLES, isValidStyle } from "./explanations";
export { HINT_LEVEL_LABELS, nextHintLevel } from "./hints";
export { checkRequestSafety, refusalMessage } from "./safety";
export { parseStructuredResponse, validateAndSanitize } from "./validator";
export { enrichWithBrainRecommendations } from "./recommendations";

export { setTutorProvider, getTutorProvider } from "./providers/base";
export { MockTutorProvider } from "./providers/mock";
export { OpenAITutorProvider } from "./providers/openai";
export { AnthropicTutorProvider } from "./providers/anthropic";
export { GeminiTutorProvider } from "./providers/gemini";

import type { TutorProvider } from "./types";
import { MockTutorProvider } from "./providers/mock";
import { OpenAITutorProvider } from "./providers/openai";
import { AnthropicTutorProvider } from "./providers/anthropic";
import { GeminiTutorProvider } from "./providers/gemini";

/**
 * Pick a provider from env without hard-failing in local dev.
 * Priority: OPENAI → ANTHROPIC → GEMINI → mock
 */
export function createDefaultProvider(): TutorProvider {
  const which = (process.env.TUTOR_PROVIDER ?? "").toLowerCase();

  try {
    if (which === "mock") return new MockTutorProvider();
    if (which === "anthropic" || process.env.ANTHROPIC_API_KEY) {
      if (which === "anthropic" || !process.env.OPENAI_API_KEY) {
        return new AnthropicTutorProvider();
      }
    }
    if (which === "gemini" || process.env.GEMINI_API_KEY) {
      if (which === "gemini") return new GeminiTutorProvider();
    }
    if (process.env.OPENAI_API_KEY) return new OpenAITutorProvider();
    if (process.env.ANTHROPIC_API_KEY) return new AnthropicTutorProvider();
    if (process.env.GEMINI_API_KEY) return new GeminiTutorProvider();
  } catch {
    // fall through to mock
  }

  return new MockTutorProvider();
}
