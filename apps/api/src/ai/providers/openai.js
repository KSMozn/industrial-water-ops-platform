import OpenAI from "openai";
import { tryParseJson } from "../validation/jsonUtil.js";

export class OpenAiProvider {
  constructor({ apiKey, model }) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey });
    this.model = model || "gpt-4o-mini";
  }

  async complete({ system, prompt }) {
    const start = Date.now();
    const resp = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const latencyMs = Date.now() - start;
    const text = resp.choices[0]?.message?.content ?? "";

    return {
      provider: "openai",
      model: this.model,
      raw: text,
      parsed: tryParseJson(text),
      usage: {
        promptTokens: resp.usage?.prompt_tokens ?? null,
        outputTokens: resp.usage?.completion_tokens ?? null,
      },
      latencyMs,
    };
  }
}
