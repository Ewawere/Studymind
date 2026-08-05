/**
 * Mock provider — deterministic responses for tests and offline dev.
 */

import type {
  TutorProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from "../types";

export class MockTutorProvider implements TutorProvider {
  readonly name = "mock";

  async generate(
    options: ProviderGenerateOptions
  ): Promise<ProviderGenerateResult> {
    const lastUser = [...options.messages]
      .reverse()
      .find((m) => m.role === "user");
    const text = lastUser?.content ?? "";

    let content =
      "Let's break this down step by step.\n\n" +
      "1. Identify what the question is asking.\n" +
      "2. Recall the related principle from your syllabus.\n" +
      "3. Apply it carefully and check units/signs.\n\n" +
      "You've got this — consistency beats cramming.";

    if (/hint|level/i.test(text)) {
      content =
        "Hint: focus on the definition first, then the formula. " +
        "What quantity is held constant in this problem?";
    }
    if (/wrong|selected/i.test(text)) {
      content +=
        "\n\nMISCONCEPTION: Mixing up related but different concepts is common here.\n" +
        "FOLLOW_UP: Can you state the definition in your own words?\n" +
        "PRACTICE: Try 3 similar questions on this concept.\n" +
        "REVISION: Review the prerequisite idea before retrying.";
    }

    return {
      content,
      model: "mock-v1",
      tokensUsed: Math.ceil(content.length / 4),
      finishReason: "stop",
    };
  }

  async *stream(options: ProviderGenerateOptions): AsyncIterable<string> {
    const result = await this.generate(options);
    const words = result.content.split(/(\s+)/);
    for (const w of words) {
      yield w;
    }
  }

  async moderate(text: string) {
    const blocked = /\b(kill|suicide|bomb how to)\b/i.test(text);
    return {
      flagged: blocked,
      reasons: blocked ? ["unsafe_content"] : [],
    };
  }
}
