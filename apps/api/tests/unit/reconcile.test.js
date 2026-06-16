import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileShipment } from "../../src/modules/inventory/reconcile.js";

const model = (code) => ({ modelCode: code });

test("clean shipment → all matched, no mismatch / missing / extra", () => {
  const r = reconcileShipment({
    id: "s1", reference: "PO-1", origin: "Offshore", status: "RECONCILED",
    lines: [
      { expectedSerial: "A1", receivedSerial: "A1", model: model("RO-2000") },
      { expectedSerial: "A2", receivedSerial: "A2", model: model("RO-2000") },
    ],
  });
  assert.equal(r.counts.matched, 2);
  assert.equal(r.counts.mismatch, 0);
  assert.equal(r.counts.missing, 0);
  assert.equal(r.counts.extra, 0);
});

test("mismatched serial → mismatch row, no missing", () => {
  const r = reconcileShipment({
    id: "s2", reference: "PO-2", origin: "Offshore", status: "DISCREPANCY",
    lines: [
      { expectedSerial: "A1", receivedSerial: "X9", model: model("RO-2000"), notes: "relabelled" },
      { expectedSerial: "A2", receivedSerial: "A2", model: model("RO-2000") },
    ],
  });
  assert.equal(r.counts.mismatch, 1);
  assert.equal(r.counts.matched, 1);
  assert.equal(r.mismatch[0].expectedSerial, "A1");
  assert.equal(r.mismatch[0].receivedSerial, "X9");
  assert.equal(r.mismatch[0].notes, "relabelled");
});

test("missing serial (null receivedSerial) → missing bucket", () => {
  const r = reconcileShipment({
    id: "s3", reference: "PO-3", origin: "Offshore", status: "DISCREPANCY",
    lines: [
      { expectedSerial: "A1", receivedSerial: null, model: model("RO-2000") },
      { expectedSerial: "A2", receivedSerial: "A2", model: model("RO-2000") },
    ],
  });
  assert.equal(r.counts.missing, 1);
  assert.equal(r.missing[0].expectedSerial, "A1");
});

test("received serial that's not in the expected set → extra bucket", () => {
  const r = reconcileShipment({
    id: "s4", reference: "PO-4", origin: "Offshore", status: "DISCREPANCY",
    lines: [
      { expectedSerial: "A1", receivedSerial: "Z9", model: model("RO-2000") },
    ],
  });
  // Z9 is also a mismatch — but it also belongs in `extra` because Z9 is not
  // anywhere on the expected list. Tracking both lets the warehouse team see
  // unexpected serials separately from swapped ones.
  assert.equal(r.counts.mismatch, 1);
  assert.equal(r.counts.extra, 1);
});
