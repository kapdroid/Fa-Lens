---
id: U-014
title: Service contracts in Zod and the first use-cases, with run coalescing
status: in_progress
tier: 2
kind: service
depends_on: [U-008, U-011]
allowed_files:
  - packages/service/src/**
  - packages/service/test/**
  - packages/service/package.json
  - packages/control/test/integration/**
adrs: [ADR-0002, ADR-0004, ADR-0016]
design: []
dod:
  - "`pnpm -s vitest run packages/service/test` fails without the use-cases and passes with them: every verb in the registry declares a Zod input and output schema, and rejecting an input the schema forbids returns a typed problem rather than throwing"
  - "`pnpm -s vitest run packages/service/test/contract.test.ts` asserts every verb has a name, a description, an input schema and an output schema, and that the registry is the only place a verb is declared, so a skin cannot invent one"
  - "`pnpm --filter @falens/control test:integration` passes a new packages/control/test/integration/coalesce.test.ts: fifty concurrent createRun calls for one scope produce exactly one run row and forty-nine callers that joined it, each carrying the same runId"
  - "`vitest packages/service/test/matrix.test.ts` shows the company matrix folding verdicts to the worst per module and testing type, and a module with no runs reading as none rather than as a failure"
  - "bash tool/gate.sh --fast is green"
evidence: [red.log, test.log, coalesce.log, gate.log]
estimate: M
owner:
---

# U-014 · Service contracts in Zod and the first use-cases, with run coalescing

## Scope
Parity between the UI, the CLI and an MCP agent is kept by construction, not by discipline (ADR-0002): every use-case declares its input and output as Zod schemas in one registry, and the three skins later generate their surfaces from it. This unit builds that registry and the first verbs: `list_modules` and `get_matrix` (reads that fold verdicts for a company), `list_flows`, `create_run` (which takes the lock, joins an equivalent run in flight per ADR-0016, and enqueues a job otherwise), and `get_run`. Use-cases take their control-plane and kernel collaborators as arguments, so the tests exercise real logic without a container, and the one behaviour that only a real database can prove — fifty callers racing for one scope — is an integration test beside U-011's.

## Out of scope
No Hono, no HTTP, no SSE, no OpenAPI generation (U-015). No MCP or CLI (U-017). No auth or roles beyond a `caller` field carried in the input. No adapters and no worker: `create_run` enqueues, it does not execute. No new control-plane tables.

## Plan
1. Contract first: `packages/service/package.json` gains zod (v4, whose built-in JSON Schema output is what U-015 will generate the OpenAPI and MCP surfaces from); the lockfile follows.
2. Tests first (red), all Docker-free under `packages/service/test/`: `contract.test.ts` asserts every verb in the registry has a name, a one-line description, an input schema and an output schema, that the names are unique and snake_case so a skin can expose them verbatim, and that the registry is the only export a skin needs; `call.test.ts` asserts an input the schema forbids comes back as a typed problem naming the field rather than throwing, and that a handler's output is validated too, so a use-case cannot quietly return the wrong shape; `runs.test.ts` asserts `create_run` computes the scope hash, asks the lock, returns `joined: true` with the existing run id when one is in flight, enqueues exactly once when it is not, and never enqueues for a joined caller; `matrix.test.ts` asserts the company matrix folds verdicts with the kernel's rollup to the worst per module and testing type and reads a module with no runs as `none`. Then `packages/control/test/integration/coalesce.test.ts` beside U-011's, asserting fifty concurrent callers produce one run row and forty-nine joins carrying the same id. Run both suites → red → `evidence/U-014/red.log`.
3. `src/ports.ts`: the small interfaces the use-cases need — `RunsPort`, `VerdictsPort`, `ModulesPort`, `LockPort`, `QueuePort` — so a use-case is testable without a database and the control plane is bound to them in one place rather than reached into from each verb.
4. `src/problem.ts`: `ServiceProblem { code, message, field? }` and `Result<T>`, the service's own shape rather than the kernel's, whose `path` is a JSON pointer into a pack.
5. `src/verbs/*.ts`: `list_modules`, `get_matrix` (folding with the kernel's `rollup`, never a second copy of that logic), `list_flows`, `create_run`, `get_run`. `create_run` follows architecture §4 in order: validate, compute `scopeHash`, take the gate, join or insert, enqueue only when it inserted, return the run id. The insert runs as raw SQL on the transaction the lock hands over, because a repository bound to the pool would run outside the gate.
6. `src/registry.ts`: the one place a verb is declared, and `call(name, input, deps)` which parses the input, runs the handler, parses the output, and turns any failure into a `ServiceProblem`. `src/index.ts` exports the registry, the ports, the problem shape and the verb types, and nothing else a skin could use to invent a verb.
7. `src/bindings.ts`: adapters from `@falens/control`'s repositories, lock and queue onto the ports, used by the integration test and later by the api and worker.
8. Green: both suites → `evidence/U-014/test.log` and `evidence/U-014/coalesce.log`; `pnpm -s typecheck`, `pnpm -s lint`, `node tool/check-boundaries.mjs`; `bash tool/gate.sh --fast` → `evidence/U-014/gate.log`.

## Verification
- `pnpm -s vitest run packages/service/test` red before, green after → `evidence/U-014/red.log`, `evidence/U-014/test.log`
- `pnpm --filter @falens/control test:integration` → `evidence/U-014/coalesce.log`
- `bash tool/gate.sh --fast` → `evidence/U-014/gate.log`

## Progress
2026-09-09 19:03 · ready · unit drafted and set ready by /build on the owner's instruction; it existed only as a roadmap row. Tier 2 plan approval is delegated and recorded at the plan step
2026-09-09 19:06 · intake · brief ok; the unit did not exist as a file, only as a roadmap row, so /build drafted it and set it ready on the owner's instruction. Tier 2 plan approval is delegated and recorded here
2026-09-09 19:06 · explore · findings recorded; the blocking question is already answered: PR #23 made pnpm-lock.yaml always allowed, and check-allowed confirms it in this worktree. Decisions on the two non-blocking ones: create_run inserts the run row with raw SQL on the transaction the lock hands over, because runsRepo.create binds to the pool and would run outside the gate, which is exactly the atomicity ADR-0016 exists to protect — follow-up: control's runsRepo could grow a transaction-aware create, but its src is outside this unit. The service defines its own problem shape rather than reusing the kernel's, whose path field is a JSON pointer into a pack. zod v4, whose built-in toJSONSchema is what U-015 will generate OpenAPI and MCP schemas from
2026-09-09 19:06 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-014-service-contracts
