import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { claimIdempotency, createExecution, getExecution, requestCancellation, repairBudgetDecision, transitionExecution } from "./execution-state";

const testUrl = process.env.TEST_DATABASE_URL;
const maybe = { skip: !testUrl ? "TEST_DATABASE_URL is required; these are real PostgreSQL integration tests" : false };
const pool = testUrl ? new pg.Pool({ connectionString: testUrl, max: 8 }) : null;
const ids: string[] = [];
const uid = () => "it-" + Date.now() + "-" + Math.random().toString(36).slice(2);
async function cleanup(id: string) { if (pool) await pool.query("DELETE FROM builder_execution_state WHERE id = $1", [id]); }

test("optimistic lock: two concurrent transitions with the same version allow exactly one", maybe, async () => {
  const id = uid(); ids.push(id);
  const execution = await createExecution({ id, goal: "race" });
  const results = await Promise.allSettled([
    transitionExecution(id, "PLANNING", "test-a", execution.version),
    transitionExecution(id, "PLANNING", "test-b", execution.version),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  const rejected = results.find((r) => r.status === "rejected");
  assert.match(String(rejected?.reason?.message), /version conflict/i);
});

test("FOR UPDATE blocks a second PostgreSQL connection until commit", maybe, async () => {
  assert(pool);
  const id = uid(); ids.push(id);
  await createExecution({ id, goal: "lock" });
  const a = await pool.connect(); const b = await pool.connect();
  try {
    await a.query("BEGIN");
    await a.query("SELECT id FROM builder_execution_state WHERE id = $1 FOR UPDATE", [id]);
    let finished = false;
    const started = Date.now();
    const waiter = (async () => {
      await b.query("BEGIN");
      await b.query("SELECT id FROM builder_execution_state WHERE id = $1 FOR UPDATE", [id]);
      finished = true; await b.query("ROLLBACK");
    })();
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(finished, false, "second connection acquired the row lock too early");
    await a.query("COMMIT"); await waiter;
    assert.ok(Date.now() - started >= 200, "second connection did not visibly wait for the lock");
  } finally { try { await a.query("ROLLBACK"); } catch {} try { await b.query("ROLLBACK"); } catch {} a.release(); b.release(); }
});

test("idempotency claim is atomic: same key is accepted once", maybe, async () => {
  const id = uid(); ids.push(id); await createExecution({ id, goal: "idempotency" });
  const [a, b] = await Promise.all([claimIdempotency(id, "same-key", { winner: "a" }), claimIdempotency(id, "same-key", { winner: "b" })]);
  assert.deepEqual([a, b].sort(), [false, true]);
});

test("cancellation is visible to a transition after the cancellation transaction commits", maybe, async () => {
  const id = uid(); ids.push(id); await createExecution({ id, goal: "cancel" });
  await requestCancellation(id, "user cancelled");
  await assert.rejects(transitionExecution(id, "PLANNING", "must not run after cancel"), /cancellation requested/i);
  const execution = await getExecution(id); assert.equal(execution.cancelRequested, true);
});

test("repair budget escalates on attempt 4 and beyond", maybe, () => {
  assert.equal(repairBudgetDecision(1), "auto-patch");
  assert.equal(repairBudgetDecision(2), "auto-patch-guard");
  assert.equal(repairBudgetDecision(3), "strategy-change");
  assert.equal(repairBudgetDecision(4), "escalate");
  assert.equal(repairBudgetDecision(5), "escalate");
});

after(async () => { for (const id of ids) await cleanup(id); await pool?.end(); });