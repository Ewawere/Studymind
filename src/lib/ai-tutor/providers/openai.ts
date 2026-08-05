/**
 * OpenAI provider using fetch so the package is optional at install time.
 * Requires OPENAI_API_KEY in env.
 */

import type {
  TutorProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
} from "../types";

export class OpenAITutorProvider implements TutorProvider {
  readonly name = "openai";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(opts?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = opts?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl = opts?.baseUrl ?? "https://api.openai.com/v1";
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAITutorProvider");
    }
  }

  async generate(
    options: ProviderGenerateOptions
  ): Promise<ProviderGenerateResult> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string }; finish_reason?: string }[];
      usage?: { total_tokens?: number };
      model?: string;
    };

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model ?? this.model,
      tokensUsed: data.usage?.total_tokens,
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  async *stream(options: ProviderGenerateOptions): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI stream error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as {
            choices: { delta?: { content?: string } }[];
          };
          const token = json.choices[0]?.delta?.content;
          if (token) yield token;
        } catch {
          /* ignore partial JSON */
        }
      }
    }
  }

  async moderate(text: string) {
    // Lightweight local filter; wire OpenAI Moderation API if needed
    const flagged = /\b(how to make a bomb|suicide methods)\b/i.test(text);
    return { flagged, reasons: flagged ? ["policy"] : [] };
  }
}
