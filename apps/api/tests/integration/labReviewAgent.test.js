import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewLabResult } from "../../src/ai/agents/labReviewAgent.js";

// Runs end-to-end against the mock provider — exercises the same path the
// labResults service uses, minus the database persistence. No network.

test("end-to-end: normal lab transcription → REVIEWED_OK shape, no anomalies", async () => {
  const { ai, validation } = await reviewLabResult({
    rawInput: `pH 7.4 conductivity 920 chlorine 0.8 turbidity 0.6 iron 0.05 hardness 110`,
    providerName: "mock",
  });
  assert.equal(ai.provider, "mock");
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.anomalies, []);
  assert.equal(validation.confidence, 1);
});

test("end-to-end: anomalous transcription → anomalies + suggested actions", async () => {
  const { validation } = await reviewLabResult({
    rawInput: `pH 5.9 conductivity 920 chlorine 0.05 turbidity 0.6 iron 0.92 hardness 110`,
    providerName: "mock",
  });
  assert.equal(validation.ok, true);
  assert.ok(validation.anomalies.length >= 3);
  assert.ok(validation.suggestedActions.length >= 3);
  assert.ok(validation.anomalies.some((a) => a.parameter === "iron" && a.severity === "critical"));
});

test("end-to-end: gibberish input → low confidence rather than fabricated readings", async () => {
  const { validation } = await reviewLabResult({
    rawInput: "no useful content here, just a customer complaint about taste",
    providerName: "mock",
  });
  assert.equal(validation.confidence, 0);
  assert.deepEqual(validation.anomalies, []);
});
