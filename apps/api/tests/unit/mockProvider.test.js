import { test } from "node:test";
import assert from "node:assert/strict";
import { MockProvider } from "../../src/ai/providers/mock.js";

test("mock provider extracts labelled numerics from prose", async () => {
  const provider = new MockProvider();
  const out = await provider.complete({
    prompt: `Sample at outlet. pH: 7.4, conductivity 920 µS/cm. Free Cl 0.8 mg/L. Turbidity 0.6 NTU. Iron 0.05. Hardness 110.`,
  });
  assert.equal(out.provider, "mock");
  assert.equal(out.parsed.ph, 7.4);
  assert.equal(out.parsed.conductivity, 920);
  assert.equal(out.parsed.chlorine, 0.8);
  assert.equal(out.parsed.turbidity, 0.6);
  assert.equal(out.parsed.iron, 0.05);
  assert.equal(out.parsed.hardness, 110);
});

test("mock provider returns nulls for missing fields rather than guessing", async () => {
  const out = await new MockProvider().complete({ prompt: "pH = 7" });
  assert.equal(out.parsed.ph, 7);
  assert.equal(out.parsed.conductivity, null);
  assert.equal(out.parsed.iron, null);
});
