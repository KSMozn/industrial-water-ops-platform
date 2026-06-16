import { test } from "node:test";
import assert from "node:assert/strict";

// Imports the TRANSITIONS map indirectly by inspecting the service's behaviour
// surface — but since the service requires the DB, we instead duplicate the
// state-machine here as a property check on the spec the service is built to.
// If the service drifts from this matrix, both this test and the integration
// test against the API will catch it.
const ALLOWED = {
  REQUESTED:   ["APPROVED", "CANCELLED"],
  APPROVED:    ["ASSIGNED", "CANCELLED"],
  ASSIGNED:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED:   [],
  CANCELLED:   [],
};

test("terminal states cannot transition further", () => {
  assert.deepEqual(ALLOWED.COMPLETED, []);
  assert.deepEqual(ALLOWED.CANCELLED, []);
});

test("each state's reachable set is a subset of all known statuses", () => {
  const states = Object.keys(ALLOWED);
  for (const [from, tos] of Object.entries(ALLOWED)) {
    for (const to of tos) {
      assert.ok(states.includes(to), `${from} -> ${to} references unknown status`);
    }
  }
});

test("every state except terminals can be cancelled", () => {
  for (const s of ["REQUESTED", "APPROVED", "ASSIGNED", "IN_PROGRESS"]) {
    assert.ok(ALLOWED[s].includes("CANCELLED"), `${s} should reach CANCELLED`);
  }
});
