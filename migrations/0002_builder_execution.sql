-- Server-backed Builder execution state.
-- Keeps lifecycle truth outside the browser so restarts cannot silently reset it.

CREATE TABLE IF NOT EXISTS builder_execution_state (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  goal TEXT,
  runtime TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  attempt INTEGER NOT NULL DEFAULT 0,
  parent_attempt_id TEXT,
  last_error TEXT,
  convergence_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (version >= 0),
  CHECK (attempt >= 0)
);

CREATE TABLE IF NOT EXISTS builder_execution_audit (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES builder_execution_state(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builder_execution_audit_execution
  ON builder_execution_audit(execution_id, id);

CREATE TABLE IF NOT EXISTS builder_repair_attempt (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES builder_execution_state(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  parent_attempt_id TEXT,
  error TEXT,
  error_class TEXT,
  classify_confidence DOUBLE PRECISION,
  patch TEXT,
  patch_size_lines INTEGER,
  preview_updated BOOLEAN NOT NULL DEFAULT FALSE,
  verification JSONB,
  duration_ms INTEGER,
  rollback_pointer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(execution_id, attempt)
);

CREATE INDEX IF NOT EXISTS idx_builder_repair_execution
  ON builder_repair_attempt(execution_id, attempt);

CREATE TABLE IF NOT EXISTS builder_execution_idempotency (
  execution_id TEXT NOT NULL REFERENCES builder_execution_state(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(execution_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS builder_execution_cancel (
  execution_id TEXT PRIMARY KEY REFERENCES builder_execution_state(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);
