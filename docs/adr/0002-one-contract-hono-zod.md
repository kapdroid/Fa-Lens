# ADR-0002 — One typed contract (Zod) drives API, MCP, and CLI

Status: accepted · Date: 2026-09-09

## Context

The product promise is parity: whatever the UI can do, the CLI and an MCP agent can do, with the same names and results. Parity kept by discipline drifts within weeks.

## Decision

Every service use-case declares its **input and output as Zod schemas** in `@falens/service`. From those schemas we generate: the **Hono** routes with OpenAPI (`@hono/zod-openapi`), the **MCP tool definitions** (name, description, JSON Schema), and the **CLI commands** (flags and help). Handlers are written once in the service layer; the three skins only adapt transport. Hono is the HTTP framework (small, typed, first-class SSE, runs on Node).

## Alternatives considered

- **Fastify + JSON Schema.** Mature; rejected because Zod gives one source for runtime validation, TypeScript types, OpenAPI, and MCP schemas without a second schema language.
- **NestJS.** Rejected: DI ceremony adds nothing to a kernel + packs design.
- **tRPC.** Great for web only; MCP and CLI need plain JSON Schema, which tRPC does not export cleanly.
- **GraphQL.** Rejected: the read shapes are fixed views (matrix, module, run), and SSE streaming is simpler over REST.

## Consequences

- Adding a verb = one schema + one handler; three skins appear for free.
- Breaking a schema breaks all three skins at compile time, which is the point.
- Long-running operations are modeled as `POST /runs` → `runId` + SSE `/runs/:id/events`; MCP exposes `run_*` + `get_run` with the same ids.

## How we verify

A contract test iterates every service verb and asserts it is reachable in all three skins with identical names (`falens <verb>`, `POST /<verb>` or the REST mapping, MCP tool `<verb>`), and that the generated OpenAPI and MCP schemas are byte-identical to the checked-in snapshots (`pnpm contract:check`).
