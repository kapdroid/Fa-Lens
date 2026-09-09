---
id: U-010
title: Control plane schema, migrations, and tenant-scoped repositories on Postgres 16
status: draft
tier: 2
kind: service
depends_on: [U-006]
allowed_files:
  - packages/control/src/schema/**
  - packages/control/src/migrations/**
  - packages/control/src/repos/**
  - packages/control/src/index.ts
  - packages/control/test/**
  - packages/control/package.json
  - packages/control/drizzle.config.ts
  - docker-compose.yml
adrs: [ADR-0004, ADR-0011, ADR-0008]
design: []
dod:
  - "`pnpm -s test:integration --filter @falens/control` passes against a Testcontainers Postgres 16: migrations apply from an empty database, a run row is inserted and read back scoped by company_id"
  - "a repository call without company_id throws `TenantScopeMissing`; the test packages/control/test/tenant-scope.test.ts fails without the guard and passes with it"
  - "after migration the evidence_rows partition for the current month exists and inserted rows carry expires_at thirty days ahead (test packages/control/test/evidence-partitions.test.ts)"
  - "`docker compose up -d postgres` followed by `pnpm -s migrate` exits 0 on a developer machine (evidence/U-010/migrate.log)"
  - "bash tool/gate.sh --fast is green"
evidence: [integration.log, migrate.log, gate.log]
estimate: M
owner:
---

# U-010 · Control plane schema, migrations, and tenant-scoped repositories on Postgres 16

## Scope
Postgres is the only writable store (ADR-0004). This unit adds the Drizzle schema and migrations for docs/architecture.md §5: registry (packs, pack_versions, flows, rules, cases, sources, source_servers, credential_refs holding only `vault://` strings), context (contexts, users, roles, mcp_tokens), ledger (runs, run_steps, verdicts, evidence_rows partitioned by month with expires_at, baselines), workflow (suggestions, issues, audit_log append-only), and infra (cache_entries UNLOGGED). Repositories expose typed reads and writes and refuse any company-scoped query that lacks company_id, so tenant isolation holds by construction. A `docker-compose.yml` with Postgres 16 and a `migrate` script give developers the local control plane; integration tests run on Testcontainers so CI needs nothing pre-installed except Docker.

## Out of scope
No queue, lock, bus, or cache implementations (U-011). No use-cases or API (service units). No source adapters (U-012, U-013). No read replica (v1.5).

## Plan
(written by /build)

## Verification
- `docker info` must succeed first (Docker Desktop running); `pnpm -s test:integration --filter @falens/control` → `evidence/U-010/integration.log`
- `docker compose up -d postgres && pnpm -s migrate` → `evidence/U-010/migrate.log`
- `bash tool/gate.sh --fast` → `evidence/U-010/gate.log`

## Progress
