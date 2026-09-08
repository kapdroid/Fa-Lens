---
paths:
  - "packages/adapters/**"
  - "packages/worker/**"
  - "packs/_sources/**"
---
# Adapters, workers, sources (tier 3 territory)

You are touching the only code that talks to production systems. ADR-0005, ADR-0013, ADR-0014 apply; read them before changing behavior.

- Every SQL path goes through the statement guard (SELECT/WITH only) and the per-server budget (concurrency, timeout, row cap). Add a test for the guard whenever you add a code path that builds SQL.
- Never add a primary server to the catalog; only replicas are listed. Never add a credential value; only `vault://` references.
- New rule types or query shapes start in fingerprint mode (aggregate first, rows for differing buckets only). If you cannot express a check that way, say so in the unit's Progress and stop; do not add a row-scan.
- Errors from a source are `error` verdicts, not `fail`; keep them distinguishable.
- Log the query fingerprint (rule id, scope, rows, duration), never raw values from rows.
- The adapter-safety-reviewer runs on every PR here; expect it to report every issue, and fix or answer each one.
