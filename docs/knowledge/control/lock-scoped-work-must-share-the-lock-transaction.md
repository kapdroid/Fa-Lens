# Work that must be atomic with a lock has to run on the lock's own transaction

`pg_advisory_xact_lock` only guards work done on the same transaction that took it. A callback passed into `Lock.acquire` that opens its own database connection (or its own transaction on the pool) looks correct — it runs "during" the lock — but is not atomic with it: the insert it performs is not covered by the lock, and a concurrent caller can race it. The first pass at U-011 called `createRun` this way, and `createRun` ran outside the transaction holding the gate, so the run row was not atomic with the decision to start it.

The fix was not to make `createRun` take a raw client (that would leak the driver into a caller who should not know which one is in use) but to hand the transaction to the caller through a narrow structural type — a `TxClient` naming only the query capability it needs, not `pg.PoolClient` or any other driver type. `acquire` still owns opening and committing the transaction; the caller only gets a handle to run queries on it.

Source: U-011, 2026-09-09 (round-1 adr-reviewer finding).
