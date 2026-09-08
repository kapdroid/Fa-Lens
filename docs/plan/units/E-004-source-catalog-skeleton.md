---
id: E-004
title: Write the v1 source catalog skeleton with tenant maps and replica-only servers
status: in_progress
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
1. Red first: `node tool/check-catalog.mjs` does not exist → `evidence/E-004/red.log` records the failing invocation; `bash tool/gate.sh --fast | grep -c '▸ catalog'` prints 0.
2. Write `tool/check-catalog.mjs` before the catalog: a zero-dependency validator with a small 2-space-indent YAML-subset parser (scalars, nested maps, `- item` lists, `#` comments; no anchors, no multi-line strings). Rules enforced, each with its own message: every SQL source (dialect mssql|postgres|clickhouse with status ≠ coming-soon) has `servers` with exactly the six tenant keys `general, mars, colpal, haldiram, slmg, bdf` and no `default` unless `shared: true`; `credential` matches `^vault://`; `replica: true`; `limits.rows`, `limits.timeoutMs`, `limits.concurrency` are positive integers; `scope.company` present; any key named `password|connectionString|primary` is an error; `unify.status == coming-soon`; HTTP sources (`app_api`, `dashboard_api`) have `baseUrl` per tenant and `kind: http`. Exit 1 with a bulleted list, exit 0 with `check-catalog: OK (N sources)`.
3. Write `packs/_sources/catalog.yaml` per ADR-0013 with the known MSSQL servers (`transaction-db`, `mars-transaction-db`, … ; `master-db`/`mars-master-db` with `Masters_GT_Replica` for general and `F2KLocationsNetworkV3` otherwise), placeholder `report-<tenant>` and `dms-<tenant>` hosts marked `confirm: true`, `unify` as `status: coming-soon`, and `vault://<source>-readonly` credentials. Write `packs/_sources/README.md`: what the catalog is, the `_sources` exception to "no server names in a pack" (server names yes, credentials never), the tenant list, and the placeholder policy.
4. Wire the stage in the unconditional block of `tool/gate.sh`: `run "catalog" node tool/check-catalog.mjs` right after `harness`.
5. Green: `node tool/check-catalog.mjs` → `evidence/E-004/catalog-check.log`; a deliberately broken copy (missing `slmg`, a `credential: not-a-vault-ref`, `replica: false`) fed via `node tool/check-catalog.mjs --file evidence/E-004/broken.yaml` → exit 1 recorded in the same log; `bash tool/gate.sh --fast` → `evidence/E-004/gate.log` showing the `catalog` stage.
6. Commit `E-004: source catalog skeleton + validator + gate stage`; evidence-collector; adr-reviewer + adapter-safety-reviewer in parallel; fresh-eyes; PR.
follow-up: `.claude/rules/packs.md` should name the `packs/_sources/**` exception explicitly (outside allowed_files here).
follow-up: confirm real Report and DMS per-tenant replica hostnames before any adapter unit connects (catalog entries carry `confirm: true`).

## Verification
- `node tool/check-catalog.mjs` → `evidence/E-004/catalog-check.log` (include one deliberately broken copy to show exit 1)
- `bash tool/gate.sh --fast` → `evidence/E-004/gate.log`
- adapter-safety-reviewer verdict → `evidence/E-004/adapter-safety-review.json`

## Progress
2026-09-09 05:08 · explore · findings: packs/ absent; frontmatter.mjs cannot parse nested YAML → decision: purpose-built 2-space indent YAML-subset parser inside check-catalog.mjs; gate stage must go in the unconditional block; .claude/rules/packs.md says 'no server names in a pack' → _sources is the ADR-0013 exception, documented in packs/_sources/README.md (rule file outside allowed_files → follow-up); tenant keys general,mars,colpal,haldiram,slmg,bdf come from the artifact-tool TENANTS map; Report/DMS hostnames are placeholders (non-blocking, structural validation only)
2026-09-09 05:08 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/E-004-source-catalog
