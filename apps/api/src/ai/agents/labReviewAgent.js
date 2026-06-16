import { getProvider } from "../providers/index.js";
import { validateLabExtraction } from "../validation/labResultValidator.js";

const SYSTEM_PROMPT = `You are a water-treatment lab report parser for an industrial water operations platform.
Your single job is to extract numeric readings from a raw lab transcription.

Output STRICT JSON with this shape (no prose, no markdown):
{
  "ph": number | null,
  "conductivity": number | null,   // µS/cm
  "chlorine": number | null,       // free Cl, mg/L
  "turbidity": number | null,      // NTU
  "iron": number | null,           // mg/L
  "hardness": number | null,       // mg/L as CaCO3
  "notes": string | null           // ANY context that didn't fit above
}

Rules:
- Use null for any reading you cannot find. DO NOT guess.
- Normalise units to the ones listed above. If the report says "EC = 1.2 mS/cm", convert to 1200 µS/cm.
- DO NOT interpret, flag, or recommend anything. The platform does that downstream.
- DO NOT return any field other than the ones in the schema.`;

/**
 * Reviews a raw lab-result transcription end-to-end:
 *   1. Calls the configured AI provider to extract structured readings.
 *   2. Runs deterministic validation (shape → plausibility → thresholds → actions → confidence).
 *   3. Returns the AI envelope AND validation result so the caller can persist both —
 *      raw model output for audit, validated structure for app use.
 *
 * The agent NEVER short-circuits validation. Even when the provider returns
 * perfect-looking JSON, the validator is the gate. This is the contract that
 * lets us swap models, prompt versions, or providers without re-auditing trust.
 */
export async function reviewLabResult({ rawInput, providerName }) {
  const provider = getProvider(providerName);
  const completion = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Extract readings from the following lab report transcription:\n\n${rawInput}`,
  });

  const validation = validateLabExtraction(completion.parsed);

  return {
    ai: completion,
    validation,
  };
}
