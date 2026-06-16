import Anthropic from "@anthropic-ai/sdk";
import { tryParseJson } from "../validation/jsonUtil.js";

export class ClaudeProvider {
  constructor({ apiKey, model }) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
    this.model = model || "claude-sonnet-4-6";
  }

  async complete({ system, prompt }) {
    const start = Date.now();
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const latencyMs = Date.now() - start;

    const text = resp.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return {
      provider: "claude",
      model: this.model,
      raw: text,
      parsed: tryParseJson(text),
      usage: {
        promptTokens: resp.usage?.input_tokens ?? null,
        outputTokens: resp.usage?.output_tokens ?? null,
      },
      latencyMs,
    };
  }
}
