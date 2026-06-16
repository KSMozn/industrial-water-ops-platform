/**
 * Models will occasionally wrap JSON in prose or fence it in code blocks. Try
 * a few extraction strategies before giving up — but never throw. Callers
 * treat null as "no parse" and let the validator surface it.
 */
export function tryParseJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();

  const candidates = [];
  candidates.push(trimmed);

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj === "object") return obj;
    } catch {
      // try next candidate
    }
  }
  return null;
}
