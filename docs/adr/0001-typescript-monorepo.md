# ADR-0001 — TypeScript monorepo, one image, four entrypoints

Status: accepted · Date: 2026-09-09

## Context

FA Lens must ship a web UI, a CLI, and an MCP server over one service layer, talk to MSSQL, Postgres, ClickHouse and HTTP, import and export Postman and k6 (both JSON/JS-native), and be built mostly through Claude Code sessions by a small team. FieldAssist backends are .NET; dashboards are Vue/Nuxt and React; contributors write packs, not application code.

## Decision

The whole application is **TypeScript on Node 22 LTS** in a **pnpm workspace with Turborepo**. Packages: `kernel`, `adapters`, `control`, `service`, `api`, `worker`, `mcp`, `cli`, `web`, `ui`, plus `packs/*` (data). One container image with four entrypoints: `api`, `worker`, `mcp`, `cli`. The kernel has zero runtime dependencies and no I/O.

## Alternatives considered

- **.NET 10 backend + React web.** Team's backend language and the best MSSQL driver. Rejected: two languages, MCP and CLI would be separate implementations, Postman/k6 need bridging, and Claude-session iteration is slower. Packs are YAML, so contributors never see the backend language, which removes .NET's main advantage here. Kept as a fallback for a MSSQL sidecar only (ADR-0005).
- **Bun runtime.** Faster startup; rejected for v1 because of edge cases with `tedious` (MSSQL). Revisit when the adapter contract tests pass on Bun.
- **Polyrepo.** Rejected: the contract (ADR-0002) must be shared by value, not by publish.

## Consequences

- One language, one test runner, one lint config, one CI.
- MSSQL performance depends on `tedious`; mitigated by adapter contract tests and the sidecar fallback.
- Boundary rules must be enforced mechanically (see verification), or the monorepo degrades into one big package.

## How we verify

`tool/check-boundaries.ts` in CI fails on any import that goes against the dependency table in `docs/architecture.md` §2 (e.g. `kernel` importing anything, `api` importing `adapters`). `pnpm build` produces exactly one image; `docker run <image> api|worker|mcp|cli --version` all succeed.
