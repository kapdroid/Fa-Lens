# Architecture Decision Records

One decision per file. Status is one of `proposed · accepted · superseded by ADR-xxxx`. A decision is changed by writing a new ADR that supersedes the old one, never by editing history.

Template: **Context** (the forces) · **Decision** (one paragraph, present tense) · **Alternatives considered** (and why not) · **Consequences** (good and bad) · **How we verify** (a check that fails if the decision is violated).

| ADR | Title | Status |
|---|---|---|
| [0001](0001-typescript-monorepo.md) | TypeScript monorepo, one image, four entrypoints | accepted |
| [0002](0002-one-contract-hono-zod.md) | One typed contract (Zod) drives API, MCP, and CLI | accepted |
| [0003](0003-flow-format-yaml.md) | Flow format: YAML, JSON-Schema validated, JSONPath extract | accepted |
| [0004](0004-postgres-only-control-plane.md) | Postgres is the only writable store; queue, locks, bus, cache on it; no Redis | accepted |
| [0005](0005-adapter-contract-read-only.md) | Adapter contract with budgets and read-only enforcement | accepted |
| [0006](0006-web-react-spa.md) | Web: React SPA with TanStack and Motion | accepted |
| [0007](0007-tokens-only-css.md) | Tokens-only CSS, linted; design contract is binding | accepted |
| [0008](0008-auth-entra-roles.md) | Identity: Entra OIDC, four roles, scoped MCP tokens | accepted |
| [0009](0009-mcp-tools-are-service-verbs.md) | MCP tools are generated from service verbs | accepted |
| [0010](0010-pack-format-registry.md) | Pack format and registry; packs are data | accepted |
| [0011](0011-testing-and-dod-gates.md) | Testing pyramid and Definition-of-Done gates | accepted |
| [0012](0012-ai-suggestion-boundary.md) | AI proposes; humans accept; runs are deterministic | accepted |
| [0013](0013-source-catalog-tenant-resolution.md) | Source catalog and tenant resolution | accepted |
| [0014](0014-source-load-strategy.md) | Source load strategy: budgets, aggregate-first, windows, shadow index | accepted |
| [0015](0015-kernel-pure-library-dependencies.md) | Kernel may depend on pure, I/O-free libraries (ajv, yaml, jsonpath-plus) | proposed |
