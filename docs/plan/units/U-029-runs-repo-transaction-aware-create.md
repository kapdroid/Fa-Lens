---
id: U-029
title: A transaction-aware create on the runs repository, so the service stops writing SQL
status: draft
tier: 2
kind: service
depends_on: [U-014]
allowed_files:
  - packages/control/src/repos/**
  - packages/control/src/index.ts
  - packages/control/test/integration/**
  - packages/service/src/verbs/**
  - packages/service/test/**
adrs: [ADR-0004, ADR-0016]
design: []
dod:
  - "`runsRepo(pool, companyId).createIn(tx, run)` inserts through the repository on a caller-supplied transaction, and `vitest packages/control/test/integration/runs-tx.test.ts` proves the row is absent after that transaction rolls back"
  - "`packages/service/src/verbs/runs.ts` contains no SQL, and `grep -c 'INSERT INTO' packages/service/src` prints 0"
  - "`pnpm --filter @falens/service test:integration` still shows fifty callers producing one run and forty-nine joins"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, integration.log]
estimate: S
owner:
---

# U-029 · A transaction-aware create on the runs repository, so the service stops writing SQL

## Scope
`create_run` inserts the run row with raw SQL because the repository binds to the pool, and the insert has to run on the transaction the lock hands over (ADR-0016). That works, but it puts knowledge of a control-plane table into the service layer. Give the repository a `createIn(tx, run)` that takes the transaction, and let the use-case call it.

## Out of scope
No change to the lock, the coalescing rule, or the run shape.

## Plan
(written by /build)

## Verification
- `pnpm --filter @falens/control test:integration` and `pnpm --filter @falens/service test:integration` → `evidence/U-029/integration.log`
- `bash tool/gate.sh --fast` → `evidence/U-029/gate.log`

## Progress
2026-09-09 · draft · created from U-014's ADR review: the service embeds SQL for a table it does not own.
