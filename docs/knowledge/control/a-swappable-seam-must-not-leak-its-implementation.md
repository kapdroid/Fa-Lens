# A seam meant to be swapped later must not expose the current implementation's concepts

The `Lock` interface in `@falens/control` exists so a later unit can swap the Postgres advisory-lock implementation for something else (NATS, per ADR-0004) without touching callers. The first pass at U-011 put `lockKey` — the 64-bit integer `pg_advisory_xact_lock` needs — on the `Lock` interface itself, reasoning that callers might want to reason about key collisions. That value has no meaning to a NATS-backed implementation; putting it on the interface would force every future implementation to either fabricate a 64-bit key or break the contract.

The fix: the key derivation function stays exported from the Postgres implementation module (so this unit's own tests, and anyone auditing collisions, can use it), but it does not appear on the `Lock` interface. The rule this generalizes: before adding a field or method to a seam interface, ask whether every plausible future backend could implement it — if the answer requires knowing today's storage engine, it belongs on the implementation, not the seam.

Source: U-011, 2026-09-09 (round-1 adr-reviewer finding).
