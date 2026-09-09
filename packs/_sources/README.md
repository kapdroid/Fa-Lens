# `_sources`: the source catalog

`catalog.yaml` is the single place that says which databases and APIs FA Lens can read, per tenant, with what budgets. Flows and rules refer to sources by logical name (`fa_txn`, `fa_master`, `report`, `dms`, `unify`, `app_api`, `dashboard_api`); the run engine resolves `(source, env, tenant)` to a server, database, and credential at run time (ADR-0013).

## The exception to "no server names in a pack"

`.claude/rules/packs.md` says a module pack carries no server names. `_sources` is the one deliberate exception: it exists precisely to hold the tenant → server maps so that no other pack ever needs one. What never appears here, in any pack, or anywhere in git: credential values, connection strings, primary hosts. Credentials are `vault://<name>` references resolved by workers from Azure Key Vault.

## Facts baked into v1 (confirmed by the owner, 2026-09-09)

- Every source is tenant-wise: `fa_txn`, `fa_master`, `report`, and `dms` each have six servers, one per tenant (`general`, `mars`, `colpal`, `haldiram`, `slmg`, `bdf`). A `default` entry is not allowed unless a source is marked `shared: true` (none in v1).
- Only read replicas are listed (`replica: true`); primaries are not in the catalog, so the run engine cannot reach one even by mistake.
- Read-only logins already exist for every source; the vault names here map to them.
- `unify` (ClickHouse) is `status: coming-soon` in v1: it renders as such in the flow map and matrix, and enabling it later is a catalog change, not code.

## Environment

`env: prod` at the top says which environment the file describes. A `beta` overlay is a second file with the same shape (`catalog.beta.yaml`), validated with `--file`; the gate validates the prod file.

## Placeholders

Entries marked `confirm: true` carry hostnames that are known in shape but not yet confirmed as **replica endpoints**: `report-<tenant>`, `dms-<tenant>`, the HTTP base URLs, and also the FA transaction/master names (`transaction-db`, `mars-transaction-db`, `master-db`, …) which are the names the artifact tools used and may resolve to a primary listener. The adapter unit must replace them with confirmed replica hosts (or record how read intent is forced per source) before anything connects. The validator accepts them and prints a warning per source; nothing connects to them until an adapter unit lands, and that unit's plan must replace them with confirmed values first.

## Validation

`node tool/check-catalog.mjs` runs in the gate (`tool/gate.sh`, stage `catalog`) and fails on: a missing tenant, a `default` server, a non-`vault://` credential, `replica` not true, a missing budget (`rows`, `timeoutMs`, `concurrency`, `interactiveMaxDays` ≤ 31), a forbidden key (`password`, `connectionString`, `primary`, …), a non-https base URL, or `unify` not marked coming-soon. It is allow-list first: only `version`, `env`, `tenants`, `sources` at the top; only the seven v1 source names; only the keys each source kind may carry; hostnames must be bare hostnames, databases identifiers, base URLs https origins; duplicate keys and tabs are parse errors. Use `--file <path>` to validate a copy.
