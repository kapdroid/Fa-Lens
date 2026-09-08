# ADR-0013 — Source catalog and tenant resolution

Status: accepted · Date: 2026-09-09

## Context

One company's data lives across FA transaction DBs (six tenant servers, same schema), FA master (two database names), Report, DMS (Postgres), and Unify (ClickHouse). Column names for the same concept differ (`CompanyId` vs `Company` vs `company_id`). Flows must run unchanged across tenants and must never contain server names or credentials.

## Decision

A **source catalog** (`packs/_sources/catalog.yaml`, admin-owned, in git, no secrets) declares each logical source: dialect, database (per tenant or default), **tenant → server map**, a `vault://` credential reference, the **scope column map** (which column is the company id, which is the date), and **budgets** (ADR-0005). Flows reference sources only by logical name (`fa_txn`, `fa_master`, `report`, `dms`, `unify`, plus HTTP bases `app_api`, `dashboard_api`). At run time the worker resolves `(source, env, tenant)` → server + database + credential, and injects `company` and date predicates using the scope map. Environments (`beta`, `prod`) have their own catalog overlays; production overlays contain read-only credentials only. Replicas are preferred whenever the catalog lists one. Adding a database is a catalog entry plus a vault secret; no code.

## Alternatives considered

- **Connection strings in flows or pack config.** Rejected: secrets in git, per-tenant copies of every flow.
- **One "current tenant" global.** Rejected: matrix and tenant-parity runs need many tenants in one job.
- **Resolving tenant from company id automatically.** Adopted as a convenience on top (a `company_tenant_map` table populated from FA master), but the context bar still shows the resolved tenant explicitly.

## Consequences

- A flow written once runs on six tenants in a matrix run.
- The catalog is the single place to answer "which server does this company live on"; the UI's Settings → Sources page renders it with health and read-only status per server.
- Nightly `catalog verify` checks that every referenced table/column exists on every server; drift marks rules `broken` before anyone runs them.
- The ADO MCP `sql_query` (500-row cap) remains a discovery and triage tool; it is never used by the run engine.

## How we verify

Catalog schema validation in CI. A resolution test table (source × tenant × env → expected server/db/credential ref) is asserted. A scope-injection test asserts every generated SQL for a company-scoped source contains the mapped company predicate. Worker startup fails if any server in the active environment lacks a read-only-verified credential.
