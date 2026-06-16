import { env } from "../../config/env.js";
import { ClaudeProvider } from "./claude.js";
import { OpenAiProvider } from "./openai.js";
import { MockProvider } from "./mock.js";

/**
 * Provider abstraction.
 *
 * All providers expose a single async method:
 *   complete({ system, prompt, jsonSchema }) -> { raw, parsed, usage, latencyMs, model, provider }
 *
 * - `raw` is the unmodified model text (preserved for audit + reprocessing).
 * - `parsed` is the best-effort JSON extraction; null if the model didn't return JSON.
 * - Providers DO NOT validate semantics — that is done downstream by validators
 *   so the same checks run regardless of provider. This keeps providers thin
 *   and lets us swap models without re-implementing trust logic.
 */
export function getProvider(name = env.ai.provider) {
  switch (name) {
    case "claude":
      return new ClaudeProvider({ apiKey: env.ai.anthropicApiKey, model: env.ai.model });
    case "openai":
      return new OpenAiProvider({ apiKey: env.ai.openaiApiKey, model: env.ai.model });
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }
}
