---
id: U-011
title: Control plane Queue, Lock, Bus, and Cache seams implemented on Postgres
status: draft
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
adrs: [ADR-0004, ADR-0014]
design: []
dod:
  - "two concurrent `lock.acquire(scopeHash)` calls in the integration test yield one holder and one `joined` result carrying the holder's runId (packages/control/test/lock.test.ts fails without the advisory lock)"
  - "`vitest packages/control/test/bus.test.ts` passes: a message published on the Bus from one connection reaches a subscriber on a second connection within one second"
  - "`vitest packages/control/test/queue.test.ts` passes: a queued job whose handler crashes is delivered again after its expiry, and a completed job is not"
  - "`cache.get` after the ttl returns a miss and before it returns the value; the UNLOGGED table and the in-memory front agree (packages/control/test/cache.test.ts)"
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
(written by /build)

## Verification
- `pnpm -s test:integration --filter @falens/control` → `evidence/U-011/integration.log`
- `bash tool/gate.sh --fast` → `evidence/U-011/gate.log`

## Progress
