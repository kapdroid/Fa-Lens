---
id: U-012
title: Adapter interface and the http adapter with budgets, breaker, and an allow-list
status: in_progress
tier: 3
kind: adapter
depends_on: [U-006]
allowed_files:
  - packages/adapters/src/**
  - packages/adapters/test/**
  - packages/adapters/package.json
adrs: [ADR-0005, ADR-0013, ADR-0014]
design: []
dod:
  - "`pnpm -s vitest run packages/adapters/test` fails without the adapter and passes with it: a request to an allow-listed host returns a chunk carrying rowsLookedAt, truncated, durationMs and server, a request to a host outside the allow-list returns the verdict `BLOCKED · host not in the catalog` without a socket ever being opened, and a method the catalog does not list for that source returns `BLOCKED · method not allowed` the same way"
  - "`vitest packages/adapters/test/http/budget.test.ts` shows concurrency never exceeding the per-host budget under 100 parallel steps, a statement beyond the timeout returning an `error` chunk rather than throwing, and a response past the row cap returning `truncated: true`"
  - "`vitest packages/adapters/test/http/breaker.test.ts` shows the breaker opening after the configured failures, refusing calls while open with `source down`, and half-opening after its cooldown"
  - "`vitest packages/adapters/test/http/redaction.test.ts` shows the request log carrying the step id, host, status, rows and duration and never a credential, a bearer token, or a value from the response body"
  - "bash tool/gate.sh --fast is green"
evidence: [red.log, test.log, gate.log]
estimate: M
owner:
---

# U-012 · Adapter interface and the http adapter with budgets, breaker, and an allow-list

## Scope
Every source FA Lens reads goes through one interface (ADR-0005). This unit defines that interface in `@falens/adapters` — `execute` streaming chunks, `probeReadOnly`, and `health` — and implements the first adapter, `http`, on undici. The http adapter enforces what ADR-0005 says it must: only hosts the catalog names may be called, per-host concurrency, a request timeout, a response size cap that sets `truncated` rather than failing, and a per-host circuit breaker whose open state reads as `source down` rather than a failed test. Every result carries `rowsLookedAt`, `truncated`, `durationMs` and `server` so the product can say "looked at N rows". Logging carries a fingerprint of the call, never a credential or a value from the body.

## Out of scope
No SQL adapters (U-013 brings mssql and postgres, and needs U-004's confirmed hostnames first). No vault client: credentials arrive as already-resolved values from the caller, and the adapter only refuses to log them. No retry policy beyond the breaker. No worker or run engine (U-016). No changes to the source catalog.

## Plan
1. Contract first: `packages/adapters/package.json` gains undici; the lockfile follows (always allowed since PR #23).
2. Tests first (red), all under `packages/adapters/test/` so they run in the fast, container-free project against a `node:http` server started per file: `http/allowlist.test.ts` asserts an allow-listed host returns a chunk carrying `rowsLookedAt`, `truncated`, `durationMs` and `server`, that a host the catalog does not name returns `BLOCKED · host not in the catalog` with the injected request function never called, and that a method outside the source's `methods` list returns `BLOCKED · method not allowed` the same way; `http/budget.test.ts` asserts concurrency never exceeds the per-host budget across 100 parallel steps, that a response slower than `timeoutMs` yields an `error` chunk rather than a throw, and that a body past the cap yields `truncated: true` with what was read; `http/breaker.test.ts` asserts the breaker opens after the configured failures, refuses while open with `source down`, and half-opens after its cooldown; `http/redaction.test.ts` asserts the log line carries step id, host, method, status, rows and duration and never the credential, the Authorization header, or a value from the body. Run `pnpm -s vitest run packages/adapters/test` → red → `evidence/U-012/red.log`.
3. `src/adapter.ts`: the ADR-0005 interface and the shapes it names but the repo has never defined — `Adapter`, `Chunk` (kind `data | blocked | error`, always carrying `rowsLookedAt`, `truncated`, `durationMs`, `server`), `ResolvedStep`, `ResolvedServer` (built from what the catalog really holds for an http source: `baseUrl` per tenant, `methods`, and `limits.timeoutMs` and `limits.concurrency`), `ExecContext`, `Verified`, `Health`, and `Budget`. These become the contract U-013's SQL adapters must match, so each field says why it exists.
4. `src/http/guard.ts`: the two refusals that must happen before any socket — the host must be one the resolved server names, and the method must be one the catalog lists for that source, which is this adapter's read-only guard.
5. `src/http/semaphore.ts` (a counting semaphore honouring `limits.concurrency` per host), `src/http/breaker.ts` (closed, open and half-open per host, with the open state reported as `source down` rather than a failure), `src/http/log.ts` (a fingerprint line built from an allow-list of fields, so a credential or a body value cannot reach it by accident).
6. `src/http/http-adapter.ts`: `httpAdapter(options)` where the request function is injectable and defaults to undici, so tests prove a blocked call opens no socket. It applies the guard, takes a permit, sends with an abort signal from `timeoutMs`, reads the body up to `DEFAULT_MAX_BYTES` (5 MB) and, when the body is a JSON array, up to `DEFAULT_MAX_ROWS` (50,000, the number the catalog already uses for SQL sources) setting `truncated` at either limit, records the breaker outcome, and yields one chunk. `probeReadOnly` confirms the source lists no method beyond GET and HEAD; `health` is a HEAD.
7. `src/index.ts` exports the interface and the adapter. Green: `pnpm -s vitest run packages/adapters/test` → `evidence/U-012/test.log`; `pnpm -s typecheck`, `pnpm -s lint`, `node tool/check-boundaries.mjs`; `bash tool/gate.sh --fast` → `evidence/U-012/gate.log`.

## Verification
- `pnpm -s vitest run packages/adapters/test` red before, green after → `evidence/U-012/red.log`, `evidence/U-012/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-012/gate.log`
- A human runs the adapter once against a real beta endpoint before U-016 uses it; tier 3 asks for that and this unit cannot do it.

## Progress
2026-09-09 18:30 · ready · unit drafted and set ready by /build on the owner's instruction; it existed only as a roadmap row
2026-09-09 18:32 · intake · brief ok; the unit did not exist as a file, only as a roadmap row, so /build drafted it and set it ready on the owner's instruction. Tier 3: plan approval is delegated and recorded here, adapter-safety-reviewer and fresh-eyes are mandatory, and the beta run a tier-3 unit asks for is a human step this session cannot do — it is written into Verification
2026-09-09 18:33 · explore · findings recorded; the blocking question is answered here because the catalog cannot express it. HTTP sources carry only timeoutMs, concurrency and interactiveMaxDays, so the response cap lives in adapter code: 5 MB of body, and 50,000 rows when the body is a JSON array, which is the number the catalog already uses for SQL sources; both are overridable per budget. follow-up: packs/_sources/catalog.yaml and tool/check-catalog.mjs should learn a maxBytes and rows limit for http sources so the number is data rather than code (both are outside this unit). Second finding worth the owner's attention: the catalog lists methods [GET, HEAD] for app_api and dashboard_api, so this adapter treats the method list as its read-only guard and will refuse the POST steps the van-sales day-cycle flow needs — architecture §8 says write-tests run only against sandbox companies on non-prod, so the catalog needs a sandbox entry that lists POST before that flow can run. Recorded as a follow-up, not worked around
2026-09-09 18:33 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-012-http-adapter
2026-09-09 18:37 · build · gate --fast green at 840b4f2; red.log 14 failing before, test.log 15 green after, boundaries clean. One bug the tests caught in my own code: a 5xx response called succeeded before failed, so the breaker's count was reset by the very responses that should have opened it — a failing status now feeds the breaker and only a healthy answer clears it
2026-09-09 18:38 · build · gate --fast green at bd0d4b2; red.log 14 failing before, test.log 15 green after, boundaries clean. One bug the tests caught in my own code: a 5xx response called succeeded before failed, so the breaker's count was reset by the very responses that should have opened it — a failing status now feeds the breaker and only a healthy answer clears it. Lint also caught a discarded loop variable used to drain a HEAD body; the drain now goes through readBody with a small cap
