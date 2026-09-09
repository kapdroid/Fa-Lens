# Stage 5 · v1 implementation roadmap

Status: **proposed 2026-09-09**, awaiting the owner's edits. Units follow the dependency direction of `docs/architecture.md` §2 (kernel → control → adapters → service → api/worker → mcp/cli → ui/web → packs). Letters refer to the v1 parts agreed in stage 1 (A foundation · B flow engine · C API testing · D data validation · F ledger · G debug · I CLI+MCP · J packs · M discovery). Only the first six units exist as files; the rest are named here so their scope can be argued before they are drafted with `/unit`.

| Unit | Part | Tier | Depends on | Outcome |
|---|---|---|---|---|
| U-006 | A | 1 | — | pnpm/Turborepo workspace, eleven packages, `check-boundaries`, gate runs typecheck/lint/test |
| U-007 | A/B | 1 | U-006 | kernel pack schema, validator, content hash |
| U-008 | B | 1 | U-007 | kernel flow AST, interpreter with I/O callback, error ≠ fail, rollup, scopeHash |
| U-009 | D | 1 | U-007 | kernel rules → SELECT-only SQL per dialect, fingerprint diff, cause words, ≤ 7-day windows |
| U-010 | A/F | 2 | U-006 | control schema + migrations, tenant-scoped repos, Testcontainers |
| U-011 | A | 2 | U-010 | Queue (pg-boss), Lock (advisory + join), Bus (LISTEN/NOTIFY), Cache (UNLOGGED) |
| U-012 | C | 3 | U-006 | `Adapter` interface, http adapter on undici with budgets and breaker |
| U-013 | D | 3 | U-012, U-004 | mssql + postgres adapters: statement guard (SELECT/WITH only), read-only probe, budgets (`MAXDOP 1`, timeout, row cap), catalog resolution needing `confirm: false` |
| U-014 | A/B | 2 | U-008, U-011 | service contracts (Zod) and use-cases: catalog, flows, runs (coalesce on scopeHash), results, matrix |
| U-015 | A | 3 | U-014 | api: Hono REST + SSE from the contracts, OpenAPI, Entra OIDC with a dev-mode issuer, rate limits |
| U-016 | B/D/F | 3 | U-014, U-013 | worker: run engine with windows, checkpoints, resume, verdict + evidence writes, bus events, stop |
| U-017 | I | 2 | U-014 | cli (`falens run/list/export/import/doctor`) and mcp server generated from the same contracts |
| U-018 | A | 2 | U-006 | ui package: tokens.css from docs/design, primitives from components.md, Stylelint tokens-only |
| U-019 | A | 2 | U-018, U-015 | web: app shell, drawer NavTree, context bar, company matrix, deep links (screens.md) |
| U-020 | C/D/G | 2 | U-019 | web: module page tabs Overview · APIs (catalog + workbench) · Cases · Flows · Validations · Runs, focus panel, empty/error states |
| U-021 | J | 2 | U-009, U-013 | van-sales pack v1: VanStock cycle rules, mapping validator, app day-cycle flow, cases, fixtures, knowledge |
| U-022 | M | 2 | U-014 | discovery: import Postman collection and OpenAPI into the catalog; export k6 script from a flow |
| U-023 | G/F | 2 | U-016, U-020 | debug: evidence panel with identity block and expiry, step trace, share link, suggestions inbox (read-only in v1) |

Open decisions the owner should settle before U-012 onward are drafted:
1. Dev-mode auth for U-015: a local issuer that mints the four roles, or Entra from day one (needs a tenant app registration).
2. U-013 waits on U-004 (confirmed replica hostnames). Until then the adapter unit can ship with the statement guard and budgets tested against Testcontainers only.
3. Whether U-020 is one unit or two (tabs are large); the build loop splits an `L` before it becomes ready.
