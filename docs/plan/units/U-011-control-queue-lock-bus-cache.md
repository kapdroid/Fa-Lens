---
id: U-011
title: Control plane Queue, Lock, Bus, and Cache seams implemented on Postgres
status: in_progress
tier: 2
kind: service
depends_on: [U-010]
allowed_files:
  - packages/control/src/queue/**
  - packages/control/src/lock/**
  - packages/control/src/bus/**
  - packages/control/src/cache/**
  - packages/control/src/index.ts
  - packages/control/test/**
  - packages/control/package.json
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
adrs: [ADR-0004, ADR-0014, ADR-0016]
design: []
dod:
  - "two concurrent `lock.acquire(scopeHash)` calls in the integration test yield one holder and one `joined` result carrying the holder's runId (packages/control/test/integration/lock.test.ts fails without the advisory lock)"
  - "`vitest packages/control/test/integration/bus.test.ts` passes: a message published on the Bus from one connection reaches a subscriber on a second connection within one second"
  - "`vitest packages/control/test/integration/queue.test.ts` passes: a queued job whose handler crashes is delivered again after its retry delay, and a completed job is not"
  - "`cache.get` after the ttl returns a miss and before it returns the value; the UNLOGGED table and the in-memory front agree (packages/control/test/integration/cache.test.ts)"
  - "bash tool/gate.sh --fast is green"
evidence: [integration.log, gate.log]
estimate: M
owner:
---

# U-011 · Control plane Queue, Lock, Bus, and Cache seams implemented on Postgres

## Scope
ADR-0004 puts the queue, locks, bus, and cache on Postgres behind four small interfaces so NATS can replace them later without touching the kernel or services. This unit defines `Queue`, `Lock`, `Bus`, and `Cache` in `@falens/control` and implements them: `Queue` on pg-boss (enqueue, work, retry, expiry), `Lock` on advisory locks keyed by scopeHash with the join semantics of docs/architecture.md §4 (a second caller for the same hash receives the running run's id instead of a new run), `Bus` on LISTEN/NOTIFY with reconnect, and `Cache` on the UNLOGGED `cache_entries` table with a memory front and ttl. Integration tests run on Testcontainers like U-010.

## Out of scope
No job handlers (worker unit). No SSE relay (api unit). No NATS implementation (v2). No run tables beyond what U-010 created.

## Plan
1. Contract first: `packages/control/package.json` gains pg-boss; `pnpm-lock.yaml` and `pnpm-workspace.yaml` follow, and any allowBuilds placeholder pnpm writes is set explicitly (the trap U-006 and U-010 both hit).
2. Tests first (red), all four under `test/integration/` so they run in the container-backed project and never in the fast one: `lock.test.ts` asserts two concurrent `acquire` calls for one scope hash yield one holder and one `{ joined: true, runId }` carrying the holder's run id, and that a third call acquires cleanly once the run leaves `queued`/`running`; `bus.test.ts` asserts a message published on one connection reaches a subscriber on a second within a second, and that a subscriber that misses an event is not broken by it (events are pointers, ADR-0004); `queue.test.ts` asserts a job whose handler throws is delivered again after its expiry and a completed job is not, on pg-boss; `cache.test.ts` asserts a value is readable before its ttl and a miss after, that the memory front and the table agree, and that a cold process reads what a warm one wrote. Run `pnpm --filter @falens/control test:integration` → red → `evidence/U-011/red.log`.
3. `src/lock/lock.ts`: the seam interface and the Postgres implementation of ADR-0016 — a transaction, `pg_advisory_xact_lock` on a 64-bit key derived from the scope hash, a look-up of an active run for that scope, and either a join or a caller-supplied insert, with the lock released by the commit. The key derivation is exported so a later unit can reason about collisions.
4. `src/bus/bus.ts`: `publish(channel, payload)` and `subscribe(channel, handler)` on LISTEN/NOTIFY over a dedicated connection, with reconnect and a payload cap that refuses more than 8 KB, since ADR-0004 says events are pointers rather than state.
5. `src/queue/queue.ts`: `Queue` over pg-boss on the same database (pg-boss owns its `pgboss` schema and creates it on start), with `send`, `work`, a documented default expiry, and a `stop` that closes cleanly for tests.
6. `src/cache/cache.ts`: `get`, `set`, `delete` over the UNLOGGED `cache_entries` table with a small in-process front, honouring `expires_at` on read so an expired row is a miss even before anything sweeps it.
7. `src/index.ts` gains the four seams and their types, keeping every existing export. Green: `pnpm --filter @falens/control test:integration` → `evidence/U-011/integration.log`; `pnpm -s test` still green and still Docker-free; `bash tool/gate.sh --fast` → `evidence/U-011/gate.log`.

## Verification
- `pnpm -s test:integration --filter @falens/control` → `evidence/U-011/integration.log`
- `bash tool/gate.sh --fast` → `evidence/U-011/gate.log`

## Progress
2026-09-09 18:09 · ready · set by /build on the owner's instruction (U-010 merged in PR #22)
2026-09-09 18:12 · intake · brief ok; status ready set in this branch on the owner's instruction. Tier 2 checkpoint: approvals are delegated ('do on behalf of me'), so the plan is approved on their behalf and recorded here
2026-09-09 18:12 · explore · findings recorded; both blocking questions resolved. (1) ADR-0004 says the advisory lock is taken in a short transaction while architecture §4 says the worker releases it — they cannot both hold, so ADR-0016 is proposed in this branch: the lock is a short mutual-exclusion gate and the runs row is the durable coalescing state; the owner accepts by merging. follow-up: architecture §4's 'releases the lock' wording should be reworded to 'finishes the run and frees the scope' (that file is outside this unit). (2) The DoD named the four test files directly under test/, where they would run in the fast, Docker-free project and start containers there; they now sit under test/integration/ like U-010's, same meaning. Also added pnpm-lock.yaml and pnpm-workspace.yaml to allowed_files (chore PR #23 makes that unnecessary for future units). Decided: the queue's default job expiry is 15 minutes, long enough for a windowed run step and short enough that a crashed worker's job returns promptly
2026-09-09 18:12 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-011-control-queue-lock-bus-cache
2026-09-09 18:17 · build · gate --fast green at 8e03a2d; red.log shows the four seams missing, integration.log 24 tests green including the queue's crash-and-retry, unit project still green and still Docker-free. Two corrections while building: pg-boss 12 exports a named PgBoss, not a default; and my first queue test put the retry delay on the worker, where pg-boss ignores it — retry and expiry are properties of the job, so the API now takes them on send and the test says why
2026-09-09 18:24 · review · adr-reviewer pass (3 should, 5 notes), all addressed in round 1. The sharpest one: createRun ran outside the transaction that holds the gate, so the run row was not atomic with the decision to start it and a job could never be enqueued in the same commit, which is exactly ADR-0004's transactional enqueue — acquire now hands the transaction to createRun through a narrow TxClient that names no driver. Also: lockKey came off the Lock interface because a NATS implementation would have no use for a 64-bit key; the bus now really reconnects and re-listens, proved by a test that terminates the backend mid-subscription; and the DoD now says retry delay rather than expiry, because that is the pg-boss mechanism the test drives. follow-up: architecture §4 still says the worker releases the lock, which ADR-0016 reinterprets — a docs unit should reword it
