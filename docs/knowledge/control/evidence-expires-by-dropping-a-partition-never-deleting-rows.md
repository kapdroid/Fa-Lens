# Evidence expires by dropping a monthly partition, never by deleting rows

Rule: `evidence_rows` is a partitioned table (one partition per month) and expiry is enforced by dropping the whole partition once every row in it is past `expires_at`, not by a `DELETE ... WHERE expires_at < now()`. The partition for a future month is created on demand (`ensureEvidencePartition(db, date)` in the repos), not pre-created for the whole year; migrations only pre-create the current and next month so a fresh database is usable immediately.

Why it matters: a test that wants to prove expiry works must drop a partition and assert its rows are gone, not insert an expired row and assert a delete job removed it — there is no delete job, and writing one would fight the design. Dropping old partitions once they are fully expired is left to an ops unit; this unit only creates partitions, it does not schedule their removal.

Source: U-010, 2026-09-09.
