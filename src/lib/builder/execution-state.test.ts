import test from "node:test";
import assert from "node:assert/strict";
import { repairBudgetDecision } from "./execution-state";

test("repair budget is bounded and escalates after strategy change", () => {
  assert.equal(repairBudgetDecision(1), "auto-patch");
  assert.equal(repairBudgetDecision(2), "auto-patch-guard");
  assert.equal(repairBudgetDecision(3), "strategy-change");
  assert.equal(repairBudgetDecision(4), "escalate");
});
