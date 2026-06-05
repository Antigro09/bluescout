import { env } from "@/lib/env";

// ===========================================================================
// Pluggable AI provider. DISABLED by default (AI_ENABLED=false).
// Enable by setting AI_ENABLED=true, AI_PROVIDER, and the matching key.
// Implementations use plain fetch — no SDK dependency — so the app installs
// and runs identically whether or not AI is ever turned on.
// ===========================================================================

export interface AICompleteOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export interface AIProvider {
  name: string;
  complete(opts: AICompleteOptions): Promise<string>;
}

export class AIDisabledError extends Error {
  constructor() {
    super(
      "AI features are disabled. Set AI_ENABLED=true, choose AI_PROVIDER, and add the matching API key in .env.",
    );
    this.name = "AIDisabledError";
  }
}

export function isAIEnabled(): boolean {
  return env.aiEnabled && env.aiProvider !== "none";
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  async complete({ system, prompt, maxTokens = 1024 }: AICompleteOptions) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
        max_tokens: maxTokens,
        // Prompt caching on the system block (instructions are reused per event).
        system: system
          ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
          : undefined,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
}

class OpenAIProvider implements AIProvider {
  name = "openai";
  async complete({ system, prompt, maxTokens = 1024 }: AICompleteOptions) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set.");
    const messages = [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        max_tokens: maxTokens,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

class OllamaProvider implements AIProvider {
  name = "ollama";
  async complete({ system, prompt }: AICompleteOptions) {
    const base = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? "llama3.1",
        stream: false,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.message?.content ?? "";
  }
}

export function getAIProvider(): AIProvider {
  if (!isAIEnabled()) throw new AIDisabledError();
  switch (env.aiProvider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new AIDisabledError();
  }
}
