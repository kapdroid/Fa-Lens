# ADR-0014 — Source load strategy: budgets, aggregate-first, windows, shadow index

Status: accepted · Date: 2026-09-09

## Context

Validations over long date ranges can hurt production databases. The user asked for a "smart sync" so that FA Lens never becomes a load problem. Copying whole production datasets is a governance and storage problem of its own.

## Decision

Load is controlled in layers; each layer is cheaper than the next and is exhausted first.

- **Layer 0, budgets (v1):** ADR-0005 budgets per server; replicas preferred; keyset paging; column allow-lists; **interactive runs capped at 31 days**. Larger ranges are refused interactively and offered as background jobs.
- **Layer 1, aggregate-first (v1):** every validation runs in **fingerprint mode** first: per bucket (company × day, or × employee) both sides return `COUNT`, `SUM` of the compared measures, and a hash. Only buckets whose fingerprints differ fetch rows. Drill-down details are fetched **by id** on demand.
- **Layer 2, windowed background runs (v1):** ranges are split into ≤ 7-day windows executed sequentially with a pause between windows; off-peak scheduling available; progress streamed; partial results visible; Stop at any time; same scope requested twice **coalesces** (ADR-0004); results served from the ledger with a "ran at" chip.
- **Layer 3, shadow index (v1.5):** for the hot validation tables, an **incremental, watermark-based sync of keys and fingerprint columns only** (ids, company/employee/van ids, dates, amounts, status flags; no PII by schema allow-list) into FA Lens Postgres, partitioned by `(source, company, month)`, 90-day retention. Fingerprints and validations then run on the shadow; sources see only the small delta sync and by-id detail reads. Staleness is shown on every result ("data as of 14:02 · 6 min behind") with a scoped "Refresh from source". A **nightly N-1 job** precomputes yesterday's verdicts for all companies, so most mornings need no run at all.
- **Layer 4, CDC (v2, only if needed):** SQL Server CDC / Postgres logical replication feeding the shadow, enabling event-driven recompute per bucket.

Explicit non-goals: no full-row warehouse; Unify is a sync **target** to validate, never the source of truth for validating itself (it may serve staleness-tolerant analytic checks).

## Alternatives considered

- **Direct queries only, forever.** Simple, but load grows with users and ranges; fails the "never be the problem" requirement.
- **Full mirror / data warehouse.** Rejected: governance, storage, and "which copy is true" disputes; the shadow keeps truth in the source.
- **Running validations on Unify.** Rejected as the primary path: circular for sync validation; kept as an optional source in the catalog.

## Consequences

- A 6-month validation touches production for ~180 aggregate queries plus rows for a handful of buckets, instead of millions of rows.
- Shadow sync is an infra commitment (watermarks, drift, retention) but a bounded one: keys and numbers only.
- Users see how much data was looked at, from where, and how fresh it is, on every result.

## How we verify

Load tests with a seeded 6-month dataset assert: rows fetched ≤ 2% of rows in scope for a 2%-mismatch seed (fingerprint mode); no query exceeds its budget; interactive `POST /runs` with > 31 days returns `409 range_too_large` with a background offer. Shadow sync tests assert idempotent delta application and PII allow-list enforcement at schema level. Dashboards plot source query counts per run with the budget as a line.
