# FA Lens — System Architecture

Status: **accepted baseline, 2026-09-09**. Every decision below has an ADR in `docs/adr/`; this document is the map, the ADRs are the reasoning. When they disagree, fix the ADR first, then this file.

FA Lens is a module-centric testing and validation platform for FieldAssist: API testing, automated flows, data validations, and cross-source sync checks, for every module and every company, with UI, CLI, and MCP parity. The design contract for the UI lives in `docs/design/`.

---

## 1. The shape

```
                      ┌──────────────────── Skins (thin, no logic) ────────────────────┐
                      │   Web (React SPA)     CLI (falens)      MCP server (tools)      │
                      └───────────────┬───────────────┬───────────────┬────────────────┘
                                      │  typed contract (Zod → OpenAPI / MCP / CLI)     │
                      ┌───────────────▼───────────────▼───────────────▼────────────────┐
                      │                    Service layer (one API)                     │
                      │   catalog · flows · runs · results · suggestions · auth/rbac   │
                      └───────┬───────────────────┬───────────────────┬────────────────┘
                              │                   │                   │
                   ┌──────────▼─────────┐ ┌───────▼────────┐ ┌────────▼────────┐
                   │ Kernel (pure)      │ │ Control plane   │ │ Workers (N)     │
                   │ flow model, verdict│ │ Postgres:       │ │ run engine,     │
                   │ scope, rules eval, │ │ ledger, registry│ │ adapters, sync, │
                   │ fingerprint diff   │ │ queue, locks,   │ │ exporters, AI   │
                   │ (no I/O)           │ │ bus, cache      │ │ generators      │
                   └────────────────────┘ └────────────────┘ └────────┬────────┘
                                                                      │ read-only, budgeted
                     ┌────────────────────────────────────────────────▼──────────────────┐
                     │ Sources (read replicas only, all tenant-wise): FA txn · FA master  │
                     │ · Report (mssql) · DMS (pg) · Unify (clickhouse, v1: coming soon)  │
                     │ · HTTP APIs (app, dashboard)                                       │
                     └───────────────────────────────────────────────────────────────────┘
```

### Four hard boundaries

1. **Kernel is pure.** No I/O. Flow model, verdict model, scope, rule evaluation, fingerprint diff, pack interpretation. Fully unit-testable; the same code runs in workers, the CLI, and (for previews) the browser. ADR-0001, ADR-0003.
2. **One service layer, three skins.** Zod schemas are the single source of truth; OpenAPI (web), MCP tool definitions, and CLI flags are generated from them. Parity by construction. ADR-0002, ADR-0009.
3. **API and workers are separate processes from one image.** The API reads the ledger and enqueues; it never touches a source database. Workers run flows, sync, exports, AI generation. They scale independently. ADR-0004, ADR-0014.
4. **Packs are data, not code.** YAML/JSON, schema-validated, versioned, hashed at publish. The kernel interprets them. A new module is a new pack; no deploy. ADR-0010.

### Navigation model the architecture serves

**Company → Module → Testing type.** Verdicts roll up from testing type to module to company. The web drawer, the company matrix, and the module tabs are three views of the same tree; the service layer exposes it once (`GET /companies/:id/matrix`).

---

## 2. Packages (pnpm workspace)

| Package | Role | Depends on |
|---|---|---|
| `@falens/kernel` | pure domain: flow, step, scope, verdict, rules, fingerprint diff, pack schema + validator | nothing |
| `@falens/adapters` | `http`, `mssql`, `postgres`, `clickhouse` behind one `Adapter` interface; budgets, breaker, read-only guard | kernel |
| `@falens/control` | Postgres control plane: Drizzle schema + migrations, repositories, `Queue` (pg-boss), `Lock` (advisory), `Bus` (LISTEN/NOTIFY), `Cache` (UNLOGGED table + memory) | kernel |
| `@falens/service` | use-cases: catalog, flows, runs, results, suggestions, auth/rbac; Zod contracts | kernel, control, adapters (workers only) |
| `@falens/api` | Hono app: REST + SSE, OIDC, rate limits; **no source access** | service |
| `@falens/worker` | job handlers: run flow, sync shadow, export, generate suggestion, catalog verify | service, adapters |
| `@falens/mcp` | MCP server: tools generated from service contracts | service |
| `@falens/cli` | `falens` binary: run, list, export, import, doctor | service (in-process) or api (remote) |
| `@falens/web` | React SPA, design contract implementation | api contract types only |
| `@falens/ui` | primitives + patterns from `docs/design/components.md`, tokens | nothing (tokens.css) |
| `packs/*` | YAML/JSON packs: `_sources/catalog.yaml`, `van-sales/`, `fa-dms-sync/`, … | kernel schema (validation only) |

Dependency direction is one-way, top of the table never imports bottom-up. `tool/check-boundaries` enforces it in CI (ADR-0011).

---

## 3. Runtime topology

```
k8s namespace falens
  api        Deployment ×2   (HPA on CPU/RPS)      → Postgres (read/write ledger), no source creds mounted
  worker     Deployment ×2   (KEDA on queue depth) → Postgres + Key Vault + sources (read-only creds)
  mcp        Deployment ×1   (same image, entry mcp) → api (or service in-process)
  web        static, served by api under /            
  postgres   managed (Azure Database for PostgreSQL Flexible), 1 primary + 1 read replica (v1.5)
  keyvault   Azure Key Vault, secrets referenced as vault://
  otel       collector sidecar → existing FA observability
```

One container image, four entrypoints (`api`, `worker`, `mcp`, `cli`). Local dev: `docker compose up postgres` + `pnpm dev` runs api + worker + web together.

---

## 4. Request and run lifecycle

**Read path (95% of traffic):** browser → api → ledger. p95 target < 200 ms. Nothing here touches a source.

**Run path:**
1. Client `POST /runs` with `{ target: flow|module|company|suite, scope }`. API validates, computes `scopeHash`, takes a Postgres advisory lock on it. If a run with the same hash is already `running`, the caller **joins** it (gets the same `runId`). Otherwise inserts `runs(status=queued)` and enqueues a pg-boss job. Returns `runId` in < 50 ms.
2. Worker picks the job. Splits the scope into **windows** (≤ 7 days each for date-scoped work) and steps. Each window is an idempotent unit: it writes a `run_steps` checkpoint on completion; a crashed worker resumes from the last checkpoint.
3. For each step the worker resolves `source` → server via tenant (ADR-0013), resolves the credential from Key Vault, and executes through the adapter with budgets (ADR-0005, ADR-0014). Aggregate-first: fingerprints per bucket first, rows only for differing buckets.
4. Progress is published on the `Bus` (`LISTEN/NOTIFY run:<id>`); the API relays it over SSE to every subscriber, on any replica.
5. On completion the worker writes `verdicts` (permanent summaries) and `evidence_rows` (partitioned, `expires_at`), updates `runs`, releases the lock, and emits the final event. The UI plays `aperture`.

**Stop:** sets `runs.cancel_requested`; the worker checks between windows and after each adapter call; partial results stay and the run is marked `stopped`.

---

## 5. Data model (control plane)

All tables carry `company_id` where the row is company-scoped; the repository layer refuses queries without it (tenant isolation by construction).

- **Registry:** `packs`, `pack_versions` (immutable, content hash, publisher), `flows`, `rules`, `cases` (belong to a pack version), `sources`, `source_servers` (tenant → server map), `credential_refs` (`vault://` only).
- **Context:** `contexts` (env, tenant, company, user presets), `users`, `roles`, `mcp_tokens` (scoped, expiring).
- **Ledger:** `runs`, `run_steps` (checkpoints, per window/step timing, rows looked at, truncated), `verdicts` (per rule/flow/type/module/company rollups, permanent), `evidence_rows` (monthly partitions, `expires_at`, 30 days), `baselines`.
- **Workflow:** `suggestions` (source, model, prompt hash, status), `issues` (status only, never touches a source), `audit_log` (append-only).
- **Shadow index (v1.5):** `shadow_<source>_<table>` partitioned by `(company_id, month)`, keys + fingerprint columns only, no PII; `sync_watermarks` per table per server.
- **Infra:** pg-boss schema, `cache_entries` (UNLOGGED, ttl), `notify` via LISTEN/NOTIFY (no table).

Retention: verdicts forever; evidence 30 days; shadow 90 days; audit forever; runs forever (summary rows are small).

---

## 6. Reliability design

| Concern | Answer |
|---|---|
| Source load | Budgets per source (concurrency 2–4, 30 s timeout, row cap, `MAXDOP 1`, snapshot reads), per-source circuit breaker, aggregate-first fingerprints, shadow index (v1.5), interactive cap 31 days, larger ranges run windowed in the background |
| Worker crash mid-run | Every window is an idempotent checkpointed step; resume from the ledger |
| Duplicate runs | Scope hash + advisory lock; second caller joins the existing run |
| One tenant's DB down | Breaker opens for that source only; other tenants proceed; matrix cells show `source down`, not `fail` |
| Accidental writes | Read-only credentials only; adapter statement guard (SELECT/WITH only); "read-only verified" probe at worker start. Three layers |
| Secret leakage | `vault://` refs in packs; resolved in workers only; redaction in logs; never in API responses |
| Storage growth | Evidence partitioned with `expires_at`; partitions dropped, never row-deleted; verdicts are small |
| Source schema drift | Nightly catalog verify: every rule's columns exist; failures mark the rule `broken` before any run |
| Flaky network vs product failure | Step verdict `error` ≠ `fail`; per-adapter retry policy; flakiness computed over last 5 runs and shown separately |
| Bad pack | Publish gate: schema, missing vars, unreachable steps, read-only violation, dry-run against fixtures |
| Wrong AI output | Suggestions never enter a module directly; Accept creates a draft; publish is a separate human action; every output carries source + model |

**SLOs (measured from day one):** API read p95 < 200 ms · interactive run (≤ 31 days) < 60 s · nightly N-1 for all companies < 2 h · source budget breaches per day = 0 · SSE event delivery < 1 s.

---

## 7. Scale path (no rewrite)

| Stage | Users | Topology | What changes |
|---|---|---|---|
| v1 | 20–50 + agents | 1 Postgres, 2 api, 2 worker | baseline |
| v1.5 | 100+, nightly all companies | shadow index on, workers 4–8 by queue depth, ledger read replica | config and pod counts |
| v2 | multi-team, 3+ api replicas | NATS JetStream replaces LISTEN/NOTIFY + cache table (via the `Bus`/`Cache` seams) | implementation swap; kernel untouched |
| v3 | CDC-grade freshness | SQL Server CDC / Postgres logical replication feed the shadow; event-driven recompute per bucket | new sync adapter; validations unchanged |

Independent scaling axes: api pods (reads), worker pods (runs), Postgres (partitions + replica), sources (never scaled, only protected).

**Redis is deliberately absent.** Its five jobs are covered by Postgres (LISTEN/NOTIFY, advisory locks, pg-boss, UNLOGGED cache, `expires_at`) plus client-side caching (TanStack Query + ETag). The exit, if needed, is NATS, behind the same seams. ADR-0004.

---

## 8. Security and governance

- Identity: Microsoft Entra OIDC; roles from groups: `admin`, `contributor`, `validator`, `agent`. MCP tokens are scoped and expiring. ADR-0008.
- Sources: read-only logins, network allow-list to worker pods, per-query audit fingerprint (rule id, scope, rows); raw SQL logged only in debug environments.
- Shadow index: keys and numbers only; PII columns excluded by an allow-list in the pack schema; 90-day retention.
- Packs: content-hashed and signed by publisher at publish; validators see published only.
- Writes: FA Lens writes only to its own Postgres. No source is ever written. Sandbox companies are the only place API write-tests run, and only on non-prod environments. ADR-0005.

---

## 9. Observability

OpenTelemetry from day one: one trace per run, one span per step (source, server, rows, duration, truncated). Metrics: queue depth, run duration p95, source query p95 per server, breaker opens, budget breaches, SSE lag. Structured logs with `runId` on every line. The Settings → Sources page renders these metrics inside the product, so a DBA never has to be the one to notice load.

---

## 10. Stack (summary; reasoning in ADRs)

TypeScript on Node 22 LTS · pnpm workspaces + Turborepo · Hono + Zod (OpenAPI) · YAML flows validated by JSON Schema (Ajv), JSONPath extract · Postgres 16 with Drizzle, pg-boss, LISTEN/NOTIFY, advisory locks · adapters on undici / tedious / pg / @clickhouse/client · React 19 + Vite SPA, TanStack Router/Query/Table/Virtual, Motion · tokens-only CSS with Stylelint · Entra OIDC · Azure Key Vault · Anthropic SDK (Sonnet 5 generators, Fable 5.1 explainers) · MCP SDK · Vitest + Playwright · OpenTelemetry · Docker + k8s (KEDA) + ADO pipelines.

---

## 11. Deliberate non-goals for v1

No Redis. No cross-server SQL. No custom code inside packs. No SSR. No writes to any source. No full-data warehouse (shadow index is keys + numbers). No UI-driver adapter yet (contract reserved). No in-tool load-test runner yet (k6 export only).
