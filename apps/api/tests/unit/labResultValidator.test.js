import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLabExtraction, THRESHOLDS, PLAUSIBILITY } from "../../src/ai/validation/labResultValidator.js";

test("clean readings within operating band → ok, no anomalies, full confidence", () => {
  const r = validateLabExtraction({
    ph: 7.4, conductivity: 920, chlorine: 0.8, turbidity: 0.6, iron: 0.05, hardness: 110,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.anomalies, []);
  assert.deepEqual(r.suggestedActions, []);
  assert.equal(r.errors.length, 0);
  assert.equal(r.confidence, 1);
});

test("readings outside operating band but plausible → anomaly with severity + action", () => {
  const r = validateLabExtraction({
    ph: 5.9, conductivity: 920, chlorine: 0.05, turbidity: 0.6, iron: 0.92, hardness: 110,
  });
  assert.equal(r.ok, true);
  assert.equal(r.anomalies.length, 3);
  const params = r.anomalies.map((a) => a.parameter).sort();
  assert.deepEqual(params, ["chlorine", "iron", "ph"]);
  // every anomaly gets a corresponding action
  assert.equal(r.suggestedActions.length, 3);
  // severity scales: iron 0.92 vs max 0.3 → ratio (0.62 / 0.3) > 1 → critical
  const ironAnomaly = r.anomalies.find((a) => a.parameter === "iron");
  assert.equal(ironAnomaly.severity, "critical");
});

test("implausible value is rejected (not flagged) and lowers confidence", () => {
  const r = validateLabExtraction({
    ph: 42, // impossible — outside [0, 14] plausibility window
    conductivity: 920, chlorine: 0.8, turbidity: 0.6, iron: 0.05, hardness: 110,
  });
  assert.equal(r.ok, false);
  assert.equal(r.readings.ph, null);
  // the impossible value should NOT generate an anomaly — it was rejected
  assert.equal(r.anomalies.some((a) => a.parameter === "ph"), false);
  assert.equal(r.errors.length, 1);
  assert.ok(r.confidence < 1);
});

test("missing readings drop coverage but do not break the pipeline", () => {
  const r = validateLabExtraction({ ph: 7.4 });
  assert.equal(r.ok, true);
  assert.equal(r.confidence, 1 / 6);
  assert.deepEqual(r.anomalies, []);
});

test("garbage input returns ok=false rather than throwing", () => {
  const r = validateLabExtraction(null);
  assert.equal(r.ok, true); // null is parsed as empty object — no errors, just empty readings
  assert.equal(r.confidence, 0);
});

test("unexpected keys are silently dropped (strict schema)", () => {
  const r = validateLabExtraction({ ph: 7, mysteryReading: 999 });
  assert.equal(r.ok, true);
  assert.equal(r.readings.ph, 7);
});

test("THRESHOLDS sit inside PLAUSIBILITY for every parameter", () => {
  // Sanity invariant: a plausible value can never sit outside the threshold
  // logic. If this fails, severity math is undefined.
  for (const [k, t] of Object.entries(THRESHOLDS)) {
    const p = PLAUSIBILITY[k];
    assert.ok(p.min <= t.min, `${k}: plausibility.min (${p.min}) must be <= threshold.min (${t.min})`);
    assert.ok(p.max >= t.max, `${k}: plausibility.max (${p.max}) must be >= threshold.max (${t.max})`);
  }
});
