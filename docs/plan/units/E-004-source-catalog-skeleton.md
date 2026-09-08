---
id: E-004
title: Write the v1 source catalog skeleton with tenant maps and replica-only servers
status: ready
tier: 3
kind: pack
depends_on: []
allowed_files:
  - packs/_sources/catalog.yaml
  - packs/_sources/README.md
  - tool/check-catalog.mjs
  - tool/gate.sh
adrs: [ADR-0005, ADR-0013, ADR-0014]
design: []
dod:
  - "packs/_sources/catalog.yaml declares fa_txn, fa_master, report, dms (all with a full tenant→server map for general, mars, colpal, haldiram, slmg, bdf), unify (status: coming-soon), app_api, dashboard_api"
  - "every SQL source has credential: vault://…, scope.company, limits (rows, timeoutMs, concurrency), and replica: true; no source has a primary or a default server"
  - "node tool/check-catalog.mjs validates the file (exit 1 on a missing tenant, a non-vault credential, a missing limit, or replica != true) and is wired into tool/gate.sh as stage 'catalog'"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, catalog-check.log, adapter-safety-review.json]
estimate: M
owner: harness
---

# E-004 · Write the v1 source catalog skeleton with tenant maps and replica-only servers

## Scope
The first real pack artifact: the source catalog from ADR-0013, using the server names already known from the artifact tools (`transaction-db`, `mars-transaction-db`, …, `master-db`/`mars-master-db` with `Masters_GT_Replica` for general and `F2KLocationsNetworkV3` for the rest) and placeholders for Report and DMS per-tenant servers (`report-<tenant>`, `dms-<tenant>`) to be confirmed. Add a zero-dependency validator (minimal YAML subset parser is acceptable; the file is flat) and a gate stage.

## Out of scope
No credentials, no adapter code, no actual connections. Unify stays `coming-soon`.

## Plan
(written by /build in state 2)

## Verification
- `node tool/check-catalog.mjs` → `evidence/E-004/catalog-check.log` (include one deliberately broken copy to show exit 1)
- `bash tool/gate.sh --fast` → `evidence/E-004/gate.log`
- adapter-safety-reviewer verdict → `evidence/E-004/adapter-safety-review.json`

## Progress
