/**
 * MockProvider — deterministic regex-based extractor used for:
 *   - integration tests (no network, reproducible)
 *   - local demos when neither ANTHROPIC_API_KEY nor OPENAI_API_KEY are set
 *
 * The mock is intentionally NOT clever: it only finds numbers next to known
 * parameter labels. This is deliberate — it forces the downstream validator
 * to handle missing fields, out-of-range values, and low confidence the same
 * way it would for a real model response. If validator coverage relies on
 * "the model always returns X", that coverage is fake.
 */
export class MockProvider {
  constructor() {
    this.model = "mock-1";
  }

  async complete({ prompt }) {
    const text = prompt.toLowerCase();
    const find = (labels, scale = 1) => {
      for (const label of labels) {
        const re = new RegExp(`${label}\\s*[:=]?\\s*([0-9]+(?:\\.[0-9]+)?)`, "i");
        const m = text.match(re);
        if (m) return Number(m[1]) * scale;
      }
      return null;
    };

    const parsed = {
      ph: find(["ph"]),
      conductivity: find(["conductivity", "ec"]),
      chlorine: find(["chlorine", "cl2", "free cl"]),
      turbidity: find(["turbidity", "ntu"]),
      iron: find(["iron", "fe"]),
      hardness: find(["hardness", "caco3"]),
      notes: "Extracted by mock provider; no model inference performed.",
    };

    const raw = JSON.stringify(parsed, null, 2);
    return {
      provider: "mock",
      model: this.model,
      raw,
      parsed,
      usage: { promptTokens: null, outputTokens: null },
      latencyMs: 1,
    };
  }
}
