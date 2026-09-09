---
id: U-010
title: Control plane schema, migrations, and tenant-scoped repositories on Postgres 16
status: review
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
  - package.json
  - vitest.workspace.ts
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
adrs: [ADR-0004, ADR-0011, ADR-0008]
design: []
dod:
  - "`pnpm --filter @falens/control test:integration` passes against a Testcontainers Postgres 16: migrations apply from an empty database, a run row is inserted and read back scoped by company_id"
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
1. Contract and wiring first: `vitest.workspace.ts` gains an `integration` project (`packages/*/test/integration/**/*.test.ts`, 120s timeouts) beside the existing `unit` project, which keeps globbing `packages/*/test/**` minus the integration folder so `pnpm -s test` stays fast and green; root `package.json` replaces the `test:integration` placeholder with `vitest run --project integration` and gains `migrate` (`pnpm -F @falens/control migrate`); `packages/control/package.json` gains drizzle-orm and pg as dependencies, drizzle-kit, testcontainers, @testcontainers/postgresql and @types/pg as dev dependencies, and its own `test:integration` and `migrate` scripts.
2. Tests first (red): `packages/control/test/integration/harness.ts` starts one Postgres 16 container per file with `@testcontainers/postgresql`, applies the migrations, and hands back a client. `migrate.test.ts` asserts migrations apply from an empty database and are idempotent on a second run. `tenant-scope.test.ts` asserts a run row round-trips scoped by company_id, and that a company-scoped repository call without a company id throws `TenantScopeMissing`. `evidence-partitions.test.ts` asserts the current month's `evidence_rows` partition exists after migration, that an inserted row lands in it with `expires_at` thirty days ahead, and that dropping a partition removes its rows without a DELETE. Run `pnpm --filter @falens/control test:integration` → red → `evidence/U-010/red.log`.
3. Schema (`src/schema/*.ts`, one file per group of docs/architecture.md §5, re-exported from `src/schema/index.ts`): registry (packs, pack_versions, flows, rules, cases, sources, source_servers, credential_refs holding only `vault://` strings), context (contexts, users, roles, mcp_tokens with scope, expiry, revocation and audit columns per ADR-0008), ledger (runs, run_steps, verdicts, evidence_rows partitioned by month with expires_at, baselines), workflow (suggestions, issues, audit_log append-only), infra (cache_entries UNLOGGED). Every company-scoped table carries `company_id` and an index leading with it.
4. Migrations (`src/migrations/`): drizzle-kit generates the table DDL from the schema; one hand-written migration adds what Drizzle cannot express — `evidence_rows` as a partitioned table, the current and next month partitions, the UNLOGGED flag on `cache_entries`, and the append-only trigger on `audit_log`. `drizzle.config.ts` points at the schema and that folder. A `migrate.ts` entry applies them with drizzle-orm's node-postgres migrator; partitions beyond the pre-created two are made by `ensureEvidencePartition(db, date)` in the repos, and dropping old partitions is left to an ops unit (architecture §6 says partitions are dropped, never row-deleted).
5. Repositories (`src/repos/`): a `db.ts` client helper, `tenant.ts` exporting `TenantScopeMissing` and a `scoped(companyId)` guard that every company-scoped read and write goes through, and `runs.ts`, `verdicts.ts`, `evidence.ts` as the first three repositories. `src/index.ts` re-exports the schema, the repositories, the guard, and `migrate`.
6. `docker-compose.yml` with Postgres 16 for local dev, matching architecture §3's `docker compose up postgres`.
7. Green: `pnpm --filter @falens/control test:integration` → `evidence/U-010/integration.log`; `docker compose up -d postgres && pnpm -s migrate` → `evidence/U-010/migrate.log`; `pnpm -s test` still green; `bash tool/gate.sh --fast` → `evidence/U-010/gate.log`.

## Verification
- `docker info` must succeed first (Docker Desktop running); `pnpm -s test:integration --filter @falens/control` → `evidence/U-010/integration.log`
- `docker compose up -d postgres && pnpm -s migrate` → `evidence/U-010/migrate.log`
- `bash tool/gate.sh --fast` → `evidence/U-010/gate.log`

## Progress
2026-09-09 16:55 · ready · set by /build on the owner's instruction; U-010 is file-disjoint from U-008 so it runs while PR #20 waits
2026-09-09 16:58 · intake · brief ok; status ready set in this branch on the owner's instruction. Tier 2 checkpoint: the owner delegated approvals ('do on behalf of me'), so the plan below is approved on their behalf and the fact recorded here
2026-09-09 16:58 · explore · findings recorded; 1 blocking question answered by correcting the unit's own contract: DoD items 1 and 4 were unreachable because allowed_files omitted pnpm-lock.yaml, vitest.workspace.ts and root package.json, which adding dependencies and wiring the integration project necessarily touch — all three added, nothing wider. Also corrected DoD 1's command: 'pnpm -s test:integration --filter @falens/control' does not parse (pnpm reads --filter before the script), so it now reads 'pnpm --filter @falens/control test:integration'. Decided (non-blocking): migrations pre-create the current and next month evidence partition and expose ensureEvidencePartition for later months; dropping old partitions belongs to an ops unit. Docker is up in this session
2026-09-09 16:58 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-010-control-plane-schema
2026-09-09 17:11 · build · gate --fast green at 792f985; 11 integration tests green on a real Postgres 16 container (migrate, tenant-scope, evidence-partitions), unit project still green, docker compose up + pnpm migrate applied both migrations and the second run was a no-op. Notes: red.log was taken by moving packages/control/src aside after the tests were written, since the gate's typecheck covers test files and a tests-only commit cannot pass; the .sql migrations are the source of truth and a drift test asserts every table the Drizzle schema declares exists after migrating; drizzle-kit is present for tooling but generates nothing today
2026-09-09 17:11 · build · note for whoever runs the full gate next: tool/gate.sh without --fast now runs the integration project, so it needs Docker; --fast still skips it and stays the pre-commit gate
2026-09-09 17:11 · build · second contract correction: pnpm wrote allowBuilds placeholders ('set this to true or false') into pnpm-workspace.yaml when testcontainers pulled ssh2, cpu-features and protobufjs, which breaks a fresh frozen install — the same defect U-006 hit with esbuild. All three set to false, which is what the green integration run already proved is enough, and pnpm-workspace.yaml added to allowed_files as a pnpm-managed side effect of adding a dependency. follow-up (harness): tool/check-allowed.mjs should always allow pnpm-lock.yaml and pnpm-workspace.yaml, since any unit that adds a dependency touches both
2026-09-09 17:19 · review · adr-reviewer pass (4 should, 3 notes), all addressed in round 1. Two were defects the evidence caught rather than opinions: the DoD's literal command could never pass because pnpm --filter runs a package script from the package directory while the vitest workspace lives at the repository root (the package script now passes --root ../..), and the documented docker compose plus migrate sequence failed once on a cold container (the CLI now waits for the database). Two were ADR drift: mcp_tokens carried a companies column although ADR-0008 keeps the allow-list inside scope, and Drizzle was a dependency used only for types while ADR-0004 names 'Drizzle ORM with migrations' — the repositories now query through the builder, with raw SQL only for partition DDL. follow-up: the drift test compares table names only; comparing information_schema.columns against the Drizzle definitions would catch a renamed column
2026-09-09 17:20 · pr · https://github.com/kapdroid/Fa-Lens/pull/22
