/**
 * Google Gemini provider.
 * Requires GEMINI_API_KEY.
 */

import type {
  TutorProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from "../types";

export class GeminiTutorProvider implements TutorProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = opts?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is required for GeminiTutorProvider");
    }
  }

  async generate(
    options: ProviderGenerateOptions
  ): Promise<ProviderGenerateResult> {
    const system = options.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const contents = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          maxOutputTokens: options.maxTokens ?? 1200,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };

    const content =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";

    return {
      content,
      model: this.model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }
}
