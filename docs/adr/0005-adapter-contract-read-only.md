# ADR-0005 — Adapter contract with budgets and read-only enforcement

Status: accepted · Date: 2026-09-09

## Context

FA Lens talks to production systems: FA transaction DBs on six tenant servers (MSSQL), FA master, Report (MSSQL), DMS (Postgres), Unify (ClickHouse), and HTTP APIs. A single unguarded query can hurt a customer's day. The tool must be unable, by construction, to write to a source or to overload one.

## Decision

All source access goes through one interface in `@falens/adapters`:

```ts
interface Adapter {
  kind: 'http' | 'mssql' | 'postgres' | 'clickhouse';
  execute(step: ResolvedStep, ctx: ExecContext): AsyncIterable<Chunk>;   // streams rows/bytes
  probeReadOnly(server: ResolvedServer): Promise<Verified>;             // at worker start
  health(server: ResolvedServer): Promise<Health>;                       // SELECT 1 / HEAD
}
```

Enforced inside every SQL adapter, not in callers: **statement guard** (only `SELECT`/`WITH`; anything else returns verdict `BLOCKED · read-only source`), **budgets** from the catalog (concurrency semaphore per server, statement timeout, row cap with `truncated` flag, `MAXDOP 1` and snapshot/`READ UNCOMMITTED` on MSSQL, `statement_timeout` on Postgres, `max_execution_time` on ClickHouse), **circuit breaker** per server, **keyset paging by id**, **column allow-list** from the rule (no `SELECT *`), and **scope injection** (`company` and date predicates added by the adapter from the catalog's scope map). Credentials are read-only logins resolved from the vault at execution time. HTTP adapter enforces per-host concurrency, timeouts, and forbids non-allow-listed hosts.

## Alternatives considered

- **Trust rules to be well-written.** Rejected: guardrails must not depend on discipline.
- **A database proxy (pgbouncer/sqlproxy) for policy.** Adds infra; still needs statement guards for MSSQL. May complement later.
- **MSSQL via a .NET sidecar from day one.** Rejected for v1; kept as the fallback if `tedious` p95 or streaming proves inadequate. The contract above makes the swap invisible to callers.

## Consequences

- Every result carries `rowsLookedAt`, `truncated`, `durationMs`, `server`, shown in the UI ("looked at N rows").
- A source outage opens only that server's breaker; runs on other tenants continue; UI shows `source down`, not `fail`.
- Some legitimate constructs (temp tables, CTE writes) are impossible by design; rules must be expressed as reads.

## How we verify

Adapter contract test suite runs against Testcontainers (MSSQL, Postgres, ClickHouse) and asserts: `UPDATE`/`DELETE`/`INSERT`/`EXEC`/`MERGE` are blocked; row cap and timeout produce `truncated`/`error` not crashes; breaker opens after N failures and half-opens; concurrency never exceeds the budget under 100 parallel steps; `probeReadOnly` fails loudly if a credential can write. Worker refuses to start if any configured server fails the read-only probe.
