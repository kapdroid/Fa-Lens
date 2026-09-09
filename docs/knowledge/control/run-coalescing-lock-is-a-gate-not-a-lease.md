# Run coalescing: the lock is a short gate, the runs row is the durable state

The advisory lock in `Lock.acquire(scopeHash)` is held only for the check-and-insert transaction, not for the lifetime of the run — `pg_advisory_xact_lock` releases automatically when that transaction commits. The mechanism that a second caller actually joins is the `runs` row: a row in `queued`/`running` for the scope hash means join, and the scope frees when the row leaves that state, including when a crashed run is later swept to `failed`.

The consequence: a worker that crashes mid-run does not leave a stuck lock to reclaim — Postgres already released it with the transaction — it leaves a `runs` row stuck in `running` with no lock behind it at all. Anything that "clears a wedged scope" has to update or sweep that row; there is no lock-timeout mechanism to lean on.

This is decided in ADR-0016 (`docs/adr/0016-run-coalescing-lock-is-short.md`, proposed). Do not write a second ADR for this; extend that one if the decision changes.

Source: U-011, 2026-09-09.
