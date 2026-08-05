/**
 * Anthropic Claude provider via Messages API.
 * Requires ANTHROPIC_API_KEY.
 */

import type {
  TutorProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from "../types";

export class AnthropicTutorProvider implements TutorProvider {
  readonly name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model =
      opts?.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for AnthropicTutorProvider");
    }
  }

  async generate(
    options: ProviderGenerateOptions
  ): Promise<ProviderGenerateResult> {
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1200,
        temperature: options.temperature ?? 0.4,
        system: system || undefined,
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      model: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      stop_reason?: string;
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    return {
      content: text,
      model: data.model,
      tokensUsed:
        (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      finishReason: data.stop_reason,
    };
  }
}
