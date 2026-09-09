-- Control plane, docs/architecture.md §5. Postgres is the only writable store (ADR-0004).
-- Every company-scoped table carries company_id and leads an index with it, so tenant isolation
-- is a property of the schema, not of the caller's diligence.

-- registry -------------------------------------------------------------------
CREATE TABLE packs (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  category      text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('module', 'sync')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pack_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id       text NOT NULL REFERENCES packs(id),
  version       text NOT NULL,
  content_hash  text NOT NULL,
  published_by  text NOT NULL,
  published_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_id, version)
);

CREATE TABLE flows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_version_id  uuid NOT NULL REFERENCES pack_versions(id),
  flow_id          text NOT NULL,
  name             text,
  UNIQUE (pack_version_id, flow_id)
);

CREATE TABLE rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_version_id  uuid NOT NULL REFERENCES pack_versions(id),
  rule_id          text NOT NULL,
  type             text NOT NULL,
  broken_reason    text,
  UNIQUE (pack_version_id, rule_id)
);

CREATE TABLE cases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_version_id  uuid NOT NULL REFERENCES pack_versions(id),
  case_id          text NOT NULL,
  kind             text NOT NULL,
  endpoint         text NOT NULL,
  UNIQUE (pack_version_id, case_id)
);

CREATE TABLE sources (
  name         text PRIMARY KEY,
  dialect      text NOT NULL CHECK (dialect IN ('http', 'mssql', 'postgres', 'clickhouse')),
  description  text
);

-- Replicas only; a primary host is never listed (ADR-0013).
CREATE TABLE source_servers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name  text NOT NULL REFERENCES sources(name),
  tenant       text NOT NULL,
  server       text NOT NULL,
  database     text,
  replica      boolean NOT NULL DEFAULT true CHECK (replica),
  UNIQUE (source_name, tenant)
);

-- Credentials live in the vault; only the reference is ever stored here (ADR-0013).
CREATE TABLE credential_refs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name  text NOT NULL REFERENCES sources(name),
  tenant       text NOT NULL,
  vault_ref    text NOT NULL CHECK (vault_ref LIKE 'vault://%'),
  UNIQUE (source_name, tenant)
);

-- context --------------------------------------------------------------------
CREATE TABLE users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL
);

CREATE TABLE roles (
  user_id  text NOT NULL REFERENCES users(id),
  role     text NOT NULL CHECK (role IN ('admin', 'contributor', 'validator', 'agent')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE contexts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL,
  env         text NOT NULL,
  tenant      text NOT NULL,
  user_id     text REFERENCES users(id),
  name        text NOT NULL
);
CREATE INDEX contexts_company_idx ON contexts (company_id, env, tenant);

CREATE TABLE mcp_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL REFERENCES users(id),
  name         text NOT NULL,
  scope        jsonb NOT NULL DEFAULT '{}'::jsonb,
  companies    text[] NOT NULL DEFAULT '{}',
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CHECK (expires_at > created_at)
);

-- ledger ---------------------------------------------------------------------
CREATE TABLE runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL,
  target_kind       text NOT NULL CHECK (target_kind IN ('flow', 'module', 'company', 'suite')),
  target_id         text NOT NULL,
  scope_hash        text NOT NULL,
  status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'stopped')),
  cancel_requested  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz
);
CREATE INDEX runs_company_created_idx ON runs (company_id, created_at DESC);
CREATE INDEX runs_scope_hash_idx ON runs (scope_hash) WHERE status IN ('queued', 'running');

CREATE TABLE run_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_id         text NOT NULL,
  window_from     date,
  window_to       date,
  status          text NOT NULL,
  rows_looked_at  bigint NOT NULL DEFAULT 0,
  truncated       boolean NOT NULL DEFAULT false,
  duration_ms     integer,
  checkpoint_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX run_steps_run_idx ON run_steps (run_id, checkpoint_at);

CREATE TABLE verdicts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    text NOT NULL,
  run_id        uuid REFERENCES runs(id),
  module        text,
  testing_type  text,
  rule_id       text,
  flow_id       text,
  severity      text NOT NULL CHECK (severity IN ('none', 'skipped', 'ok', 'warn', 'error', 'fail')),
  counts        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verdicts_company_module_idx ON verdicts (company_id, module, testing_type, created_at DESC);

-- Evidence is dropped by partition, never deleted row by row (docs/architecture.md §6).
CREATE TABLE evidence_rows (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id  text NOT NULL,
  run_id      uuid NOT NULL,
  bucket_key  text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '30 days',
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE INDEX evidence_rows_company_idx ON evidence_rows (company_id, run_id);

CREATE TABLE baselines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL,
  key         text NOT NULL,
  value       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, key)
);

-- workflow -------------------------------------------------------------------
CREATE TABLE suggestions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   text NOT NULL,
  source       text NOT NULL,
  model        text NOT NULL,
  prompt_hash  text NOT NULL,
  status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'rejected')),
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suggestions_company_idx ON suggestions (company_id, status, created_at DESC);

CREATE TABLE issues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL,
  status      text NOT NULL DEFAULT 'open',
  title       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issues_company_idx ON issues (company_id, status);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  company_id  text,
  actor       text NOT NULL,
  action      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_company_idx ON audit_log (company_id, at DESC);

CREATE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_is_append_only();

-- infra ----------------------------------------------------------------------
-- Unlogged on purpose: the cache may be lost on a crash without harm (ADR-0004).
CREATE UNLOGGED TABLE cache_entries (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  expires_at  timestamptz NOT NULL
);
CREATE INDEX cache_entries_expiry_idx ON cache_entries (expires_at);
