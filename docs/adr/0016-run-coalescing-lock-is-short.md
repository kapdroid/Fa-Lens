# ADR-0016 — Run coalescing: a short lock, a durable run row

Status: proposed · Date: 2026-09-09

## Context

Two accepted documents describe the same mechanism differently. ADR-0004 says "advisory locks are per connection; the API takes them in a short transaction that also inserts the `runs` row". `docs/architecture.md` §4 says the worker, on completion, "releases the lock". Those cannot both be true: a lock held from the API request until a worker in another process finishes would have to survive the request's connection returning to the pool, and would be lost if that worker crashed, leaving the scope either wedged or silently free. The first unit to implement the `Lock` seam (U-011) has to pick one.

## Decision

The advisory lock is a **short mutual-exclusion gate**, not a lease on the run. `Lock.acquire(scopeHash)` opens a transaction, takes `pg_advisory_xact_lock` on a 64-bit key derived from the scope hash, looks for a run with that scope hash in status `queued` or `running`, and either returns `{ joined: true, runId }` for the run it found or lets the caller insert a new `runs` row and returns `{ joined: false }`. The transaction commits, and Postgres releases the lock with it. **The durable coalescing state is the `runs` row**, not the lock: a second caller joins because a row says a run is in flight, and the scope frees when that row leaves `queued`/`running` — including when a crashed run is swept to `failed`. `docs/architecture.md` §4's "releases the lock" is read as "finishes the run and frees the scope".

## Alternatives considered

- **Session-held advisory lock for the run's lifetime.** Rejected: it pins a pooled connection for minutes, cannot cross the API-to-worker process boundary, and a worker crash releases it while the run row still says `running`, so the two sources of truth disagree exactly when it matters.
- **A unique index on `(scope_hash)` where status is active, and no lock at all.** Rejected on its own: it prevents the duplicate but gives the loser an error to interpret rather than the existing `runId` to join, and the check-then-insert still races without the gate. The partial index stays as a belt-and-braces constraint.

## Consequences

- `Lock` is cheap and pool-friendly: no connection is held between requests, and the 500-concurrent-callers test in ADR-0004 becomes a test of the gate plus the row, not of lock leases.
- A run that dies without updating its row keeps its scope busy until a sweeper moves it to `failed`. That sweeper is a worker-unit concern; until it exists, a wedged scope is cleared by updating the row, which is visible and explainable.
- The lock key is a hash of the scope hash, so two different scopes can collide in principle; a collision costs a moment of serialisation, never a wrong answer, because the run row is checked inside the gate.

## How we verify

`packages/control/test/integration/lock.test.ts` runs two concurrent `acquire` calls for one scope hash against a real Postgres and asserts exactly one holder and one join carrying the holder's `runId`; a third call after the run leaves `queued`/`running` acquires cleanly.
