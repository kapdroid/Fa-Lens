# ADR-0004 — Postgres is the only writable store; queue, locks, bus, cache on it; no Redis

Status: accepted · Date: 2026-09-09

## Context

FA Lens needs a ledger (runs, verdicts, evidence), a registry (packs, flows, rules, sources), a job queue, distributed locks for coalescing, a pub/sub bus for SSE fan-out across API replicas, and a small server-side cache. Expected load: 20–50 people plus agents at v1, hundreds at v1.5. Every extra service is another failure mode, backup, and on-call surface.

## Decision

**Postgres 16 is the single writable store** and the whole control plane in v1: Drizzle ORM with migrations; **pg-boss** for jobs and schedules; **advisory locks** for run coalescing; **LISTEN/NOTIFY** for the bus; an **UNLOGGED `cache_entries`** table for server cache; `expires_at` + monthly partitions for evidence. The kernel exposes seams `Queue`, `Lock`, `Bus`, `Cache`; v1 implementations are Postgres-backed. **Redis is not used.** If a documented trigger fires, the `Bus`/`Cache` implementations move to **NATS JetStream** (pub/sub, KV with TTL, streams in one binary), not Redis. Read caching is first done on the client (TanStack Query + HTTP ETag).

## Alternatives considered

- **Redis for cache/locks/pub-sub.** Rejected for v1: a second stateful service for jobs Postgres already does at this scale; SET-NX locks are not transactional with the ledger; hot-cache value is low because 95% of reads are ledger reads of small rows.
- **BullMQ.** Requires Redis. pg-boss covers retries, cron, priority, and transactional enqueue with ledger writes.
- **Kafka.** Far beyond the need; NATS is the exit if a bus is needed.
- **Storing evidence in object storage (blobs).** Rejected for v1: queryable, exportable evidence with visible expiry is easier in partitioned tables; revisit if evidence exceeds ~200 GB.

## Consequences

- One backup, one connection pool, one failure mode. Transactional enqueue: a run row and its job commit together.
- LISTEN/NOTIFY payload is 8 KB max and fire-and-forget; events are pointers (`run:<id>` + sequence), clients re-fetch state. Missed events are harmless.
- Advisory locks are per connection; the API takes them in a short transaction that also inserts the `runs` row.
- Exit triggers (any one): 3+ API replicas with SSE lag > 1 s; > 1,000 NOTIFY/s sustained; pg-boss queue-wait p95 > 60 s; lock wait visible on `pg_stat_activity`.

## How we verify

Contract tests for `Queue`, `Lock`, `Bus`, `Cache` run against the Postgres implementations in CI (Testcontainers). A load test pushes 500 concurrent `POST /runs` for one scope and asserts exactly one worker execution (coalescing). Dashboards show queue depth and NOTIFY rate with the exit thresholds drawn as lines.
