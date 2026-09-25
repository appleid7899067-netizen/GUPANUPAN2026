import { getSql, type Sql } from "@/lib/db";
import { canTransition } from "./state-machine";
import type { BuilderLifecycleState } from "./types";

export type ExecutionState = {
  id: string;
  state: BuilderLifecycleState;
  version: number;
  goal: string | null;
  runtime: string | null;
  cancelRequested: boolean;
  attempt: number;
  parentAttemptId: string | null;
  lastError: string | null;
  convergenceKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransitionResult = ExecutionState & {
  changed: boolean;
  auditId?: number;
};

export type RepairAttemptInput = {
  id: string;
  executionId: string;
  attempt: number;
  parentAttemptId?: string | null;
  error?: string | null;
  errorClass?: string | null;
  classifyConfidence?: number | null;
  patch?: string | null;
  patchSizeLines?: number | null;
  previewUpdated?: boolean;
  verification?: unknown;
  durationMs?: number | null;
  rollbackPointer?: string | null;
};

type DbExecutionRow = {
  id: string;
  state: BuilderLifecycleState;
  version: number;
  goal: string | null;
  runtime: string | null;
  cancel_requested: boolean;
  attempt: number;
  parent_attempt_id: string | null;
  last_error: string | null;
  convergence_key: string | null;
  created_at: string;
  updated_at: string;
};

function mapExecution(row: DbExecutionRow): ExecutionState {
  return {
    id: row.id,
    state: row.state,
    version: Number(row.version),
    goal: row.goal,
    runtime: row.runtime,
    cancelRequested: Boolean(row.cancel_requested),
    attempt: Number(row.attempt),
    parentAttemptId: row.parent_attempt_id,
    lastError: row.last_error,
    convergenceKey: row.convergence_key,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function txRequired(sql: Sql): NonNullable<Sql["transaction"]> {
  if (!sql.transaction) throw new Error("Database transaction support is unavailable");
  return sql.transaction.bind(sql);
}

export async function createExecution(input: {
  id: string;
  goal: string;
  runtime?: string | null;
}): Promise<ExecutionState> {
  const sql = await getSql();
  await sql.query(
    `INSERT INTO builder_execution_state (id, state, goal, runtime)
     VALUES ($1, 'GOAL', $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [input.id, input.goal, input.runtime ?? null],
  );
  return getExecution(input.id);
}

export async function getExecution(id: string): Promise<ExecutionState> {
  const sql = await getSql();
  const rows = await sql.query<DbExecutionRow>(
    "SELECT * FROM builder_execution_state WHERE id = $1",
    [id],
  );
  if (!rows[0]) throw new Error(`Execution not found: ${id}`);
  return mapExecution(rows[0]);
}

export async function transitionExecution(
  id: string,
  to: BuilderLifecycleState,
  reason: string,
  expectedVersion?: number,
): Promise<TransitionResult> {
  const sql = await getSql();
  const transaction = txRequired(sql);
  return transaction(async (tx) => {
    const rows = await tx.query<DbExecutionRow>(
      "SELECT * FROM builder_execution_state WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = rows[0];
    if (!current) throw new Error(`Execution not found: ${id}`);

    if (expectedVersion != null && Number(current.version) !== expectedVersion) {
      throw new Error(
        `Execution version conflict: expected ${expectedVersion}, got ${current.version}`,
      );
    }

    if (current.state === to) {
      return { ...mapExecution(current), changed: false };
    }

    if (!canTransition(current.state, to)) {
      throw new Error(`Invalid lifecycle transition: ${current.state} -> ${to}`);
    }

    const nextVersion = Number(current.version) + 1;
    await tx.query(
      `UPDATE builder_execution_state
       SET state = $2, version = $3, updated_at = now()
       WHERE id = $1`,
      [id, to, nextVersion],
    );

    const audit = await tx.query<{ id: number }>(
      `INSERT INTO builder_execution_audit
         (execution_id, from_state, to_state, reason, version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [id, current.state, to, reason, nextVersion],
    );

    const updated = await tx.query<DbExecutionRow>(
      "SELECT * FROM builder_execution_state WHERE id = $1",
      [id],
    );
    return { ...mapExecution(updated[0]), changed: true, auditId: Number(audit[0].id) };
  });
}

export async function requestCancellation(id: string, reason?: string): Promise<void> {
  const sql = await getSql();
  await sql.transaction?.(async (tx) => {
    await tx.query(
      `INSERT INTO builder_execution_cancel (execution_id, reason)
       VALUES ($1, $2)
       ON CONFLICT (execution_id)
       DO UPDATE SET requested_at = now(), reason = EXCLUDED.reason`,
      [id, reason ?? null],
    );
    await tx.query(
      `UPDATE builder_execution_state
       SET cancel_requested = TRUE, updated_at = now()
       WHERE id = $1`,
      [id],
    );
  });
}

export async function clearCancellation(id: string): Promise<void> {
  const sql = await getSql();
  await sql.query("DELETE FROM builder_execution_cancel WHERE execution_id = $1", [id]);
  await sql.query(
    "UPDATE builder_execution_state SET cancel_requested = FALSE, updated_at = now() WHERE id = $1",
    [id],
  );
}

export async function isCancellationRequested(id: string): Promise<boolean> {
  const execution = await getExecution(id);
  return execution.cancelRequested;
}

export async function recordRepairAttempt(input: RepairAttemptInput): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `INSERT INTO builder_repair_attempt
      (id, execution_id, attempt, parent_attempt_id, error, error_class,
       classify_confidence, patch, patch_size_lines, preview_updated,
       verification, duration_ms, rollback_pointer)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (execution_id, attempt) DO UPDATE SET
       parent_attempt_id=EXCLUDED.parent_attempt_id,
       error=EXCLUDED.error,
       error_class=EXCLUDED.error_class,
       classify_confidence=EXCLUDED.classify_confidence,
       patch=EXCLUDED.patch,
       patch_size_lines=EXCLUDED.patch_size_lines,
       preview_updated=EXCLUDED.preview_updated,
       verification=EXCLUDED.verification,
       duration_ms=EXCLUDED.duration_ms,
       rollback_pointer=EXCLUDED.rollback_pointer`,
    [
      input.id, input.executionId, input.attempt, input.parentAttemptId ?? null,
      input.error ?? null, input.errorClass ?? null, input.classifyConfidence ?? null,
      input.patch ?? null, input.patchSizeLines ?? null, input.previewUpdated ?? false,
      input.verification == null ? null : JSON.stringify(input.verification),
      input.durationMs ?? null, input.rollbackPointer ?? null,
    ],
  );
}

export async function claimIdempotency(
  executionId: string,
  key: string,
  result?: unknown,
): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query(
    `INSERT INTO builder_execution_idempotency (execution_id, idempotency_key, result)
     VALUES ($1, $2, $3)
     ON CONFLICT (execution_id, idempotency_key) DO NOTHING
     RETURNING idempotency_key`,
    [executionId, key, result == null ? null : JSON.stringify(result)],
  );
  return rows.length > 0;
}

export function repairBudgetDecision(attempt: number):
  | "auto-patch"
  | "auto-patch-guard"
  | "strategy-change"
  | "escalate" {
  if (attempt <= 1) return "auto-patch";
  if (attempt === 2) return "auto-patch-guard";
  if (attempt === 3) return "strategy-change";
  return "escalate";
}

export async function hasConverged(
  executionId: string,
  convergenceKey: string,
): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ convergence_key: string | null }>(
    "SELECT convergence_key FROM builder_execution_state WHERE id = $1",
    [executionId],
  );
  if (!rows[0]) throw new Error(`Execution not found: ${executionId}`);
  return rows[0].convergence_key === convergenceKey;
}

export async function setConvergenceKey(
  executionId: string,
  convergenceKey: string | null,
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    "UPDATE builder_execution_state SET convergence_key = $2, updated_at = now() WHERE id = $1",
    [executionId, convergenceKey],
  );
}
