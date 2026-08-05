/**
 * AI Tutor Orchestrator
 *
 * Context → Safety → Prompt → Provider → Validate → Persist → Enrich
 */

import { buildTutorContext } from "./context";
import { buildMessages } from "./prompts";
import { checkRequestSafety, refusalMessage } from "./safety";
import { parseStructuredResponse } from "./validator";
import {
  getOrCreateConversation,
  appendMessage,
} from "./conversation";
import { enrichWithBrainRecommendations } from "./recommendations";
import { getTutorProvider } from "./providers/base";
import type {
  TutorRequest,
  TutorStructuredResponse,
  ExplanationStyle,
} from "./types";

export async function runTutor(
  req: TutorRequest
): Promise<TutorStructuredResponse> {
  const ctx = await buildTutorContext(req);
  const style: ExplanationStyle = req.style ?? ctx.preferredStyle;

  const safety = checkRequestSafety(req, ctx);
  if (!safety.allowed) {
    return {
      explanation: refusalMessage(safety.reasons),
      hint: null,
      misconception: null,
      confidence: 1,
      recommendedPractice: null,
      recommendedRevision: null,
      followUpQuestion: null,
      suggestedDifficulty: null,
      nextActions: ["ask_topic"],
      message: refusalMessage(safety.reasons),
      style,
      capability: req.capability,
    };
  }

  const conversationId = await getOrCreateConversation({
    userId: req.userId,
    conversationId: req.conversationId ?? ctx.conversationId,
    mode: req.capability === "free_ask" ? "ask" : req.capability,
    subjectId: req.subjectId,
  });

  // Refresh context with conversation id for message history
  if (!req.conversationId) {
    req = { ...req, conversationId };
  }
  const ctxWithConvo =
    conversationId === ctx.conversationId
      ? ctx
      : await buildTutorContext({ ...req, conversationId });

  const messages = buildMessages(ctxWithConvo, req);
  const provider = getTutorProvider();

  if (req.message?.trim()) {
    await appendMessage({
      conversationId,
      role: "user",
      content: req.message.trim(),
    });
  } else if (req.questionId && req.capability === "explain_wrong_answer") {
    await appendMessage({
      conversationId,
      role: "user",
      content: `Help me understand why my answer was wrong on this question.${req.selectedKey ? ` I chose ${req.selectedKey}.` : ""}`,
    });
  }

  const result = await provider.generate({
    messages,
    temperature: req.capability === "generate_hint" ? 0.3 : 0.45,
    maxTokens: 1200,
  });

  let structured = parseStructuredResponse(result.content, {
    style,
    capability: req.capability,
    model: result.model,
    tokensUsed: result.tokensUsed,
  });

  structured = await enrichWithBrainRecommendations(
    req.userId,
    structured,
    ctxWithConvo
  );

  await appendMessage({
    conversationId,
    role: "assistant",
    content: structured.message,
    model: result.model,
    tokensUsed: result.tokensUsed,
  });

  // Attach conversation id for clients via nextActions metadata pattern
  structured.nextActions = [
    ...structured.nextActions,
    `conversation:${conversationId}`,
  ];

  return structured;
}

/**
 * Streaming variant — yields text chunks, then callers can persist full text.
 */
export async function* streamTutor(
  req: TutorRequest
): AsyncGenerator<string, TutorStructuredResponse, void> {
  const ctx = await buildTutorContext(req);
  const style: ExplanationStyle = req.style ?? ctx.preferredStyle;
  const safety = checkRequestSafety(req, ctx);

  if (!safety.allowed) {
    const msg = refusalMessage(safety.reasons);
    yield msg;
    return {
      explanation: msg,
      hint: null,
      misconception: null,
      confidence: 1,
      recommendedPractice: null,
      recommendedRevision: null,
      followUpQuestion: null,
      suggestedDifficulty: null,
      nextActions: [],
      message: msg,
      style,
      capability: req.capability,
    };
  }

  const conversationId = await getOrCreateConversation({
    userId: req.userId,
    conversationId: req.conversationId ?? ctx.conversationId,
    mode: "ask",
    subjectId: req.subjectId,
  });

  const messages = buildMessages(
    { ...ctx, conversationId },
    { ...req, conversationId }
  );
  const provider = getTutorProvider();

  if (!provider.stream) {
    const full = await runTutor({ ...req, conversationId });
    yield full.message;
    return full;
  }

  if (req.message?.trim()) {
    await appendMessage({
      conversationId,
      role: "user",
      content: req.message.trim(),
    });
  }

  let assembled = "";
  for await (const chunk of provider.stream({
    messages,
    temperature: 0.45,
    maxTokens: 1200,
  })) {
    assembled += chunk;
    yield chunk;
  }

  let structured = parseStructuredResponse(assembled, {
    style,
    capability: req.capability,
    model: provider.name,
  });
  structured = await enrichWithBrainRecommendations(
    req.userId,
    structured,
    ctx
  );

  await appendMessage({
    conversationId,
    role: "assistant",
    content: structured.message,
    model: provider.name,
  });

  structured.nextActions = [
    ...structured.nextActions,
    `conversation:${conversationId}`,
  ];
  return structured;
}
