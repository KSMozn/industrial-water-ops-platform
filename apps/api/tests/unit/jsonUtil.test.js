import { test } from "node:test";
import assert from "node:assert/strict";
import { tryParseJson } from "../../src/ai/validation/jsonUtil.js";

test("parses raw JSON", () => {
  assert.deepEqual(tryParseJson('{"a": 1}'), { a: 1 });
});

test("extracts JSON from fenced code block", () => {
  const text = "Sure! Here is the result:\n```json\n{\"ph\": 7.4}\n```\nLet me know if you need more.";
  assert.deepEqual(tryParseJson(text), { ph: 7.4 });
});

test("extracts JSON from prose surrounding braces", () => {
  assert.deepEqual(tryParseJson("Result: {\"x\": 2} — done."), { x: 2 });
});

test("returns null instead of throwing on garbage", () => {
  assert.equal(tryParseJson("not json"), null);
  assert.equal(tryParseJson(""), null);
  assert.equal(tryParseJson(null), null);
});
