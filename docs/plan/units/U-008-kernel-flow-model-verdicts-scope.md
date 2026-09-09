---
id: U-008
title: Kernel flow model, step semantics, verdict rollup, and scope hash
status: in_progress
tier: 1
kind: kernel
depends_on: [U-007]
allowed_files:
  - packages/kernel/src/flow/**
  - packages/kernel/src/verdict/**
  - packages/kernel/src/scope/**
  - packages/kernel/src/index.ts
  - packages/kernel/test/flow/**
  - packages/kernel/test/verdict/**
  - packages/kernel/test/scope/**
adrs: [ADR-0003, ADR-0001, ADR-0014]
design: []
dod:
  - "`vitest packages/kernel/test/flow` fails without the interpreter and passes with it: a fixture flow interpolates `{{ }}` variables from context and earlier extracts, extracts with JSONPath, and evaluates status, JSONPath, and latency assertions"
  - "a step whose executor callback throws yields verdict `error`, a failed assertion yields `fail`, and the two never merge (test packages/kernel/test/verdict/error-vs-fail.test.ts)"
  - "`rollup()` folds step → flow → testing type → module → company with worst-of severity and counts, matching the fixture expectations (test packages/kernel/test/verdict/rollup.test.ts)"
  - "`scopeHash()` is identical for the same scope with keys in a different order and differs when the date range changes (test packages/kernel/test/scope/hash.test.ts)"
  - "bash tool/gate.sh --fast is green"
evidence: [test.log, gate.log]
estimate: M
owner:
---

# U-008 · Kernel flow model, step semantics, verdict rollup, and scope hash

## Scope
A flow (ADR-0003) is a YAML sequence of steps with variables, extracts, and assertions. This unit adds the typed flow AST built on U-007's schemas, an interpreter `runFlow(flow, context, execute)` where `execute(request)` is a callback supplied by the caller (workers pass an adapter, tests pass a stub) so the kernel never performs I/O, `{{ }}` interpolation from context and previous extracts, JSONPath extraction, the assertion set (status code, JSONPath equals/exists/matches, latency under), and the step verdict model where `error` (transport, exception) is distinct from `fail` (assertion) as docs/architecture.md §6 requires. It also adds the verdict rollup used by the company matrix and the module tabs (step → flow → testing type → module → company), and the scope model (env, tenant, company, user, date range) with a canonical `scopeHash` that the run coalescing lock keys on.

## Out of scope
No HTTP client, no adapters (U-012). No windowing of date ranges (U-009). No persistence of verdicts (U-010). No AI explanations.

## Plan
1. Tests first (red): `packages/kernel/test/flow/fixtures.ts` builds flows as YAML strings parsed with U-007's `parsePack`, so the AST under test is the one the validator already accepts. `flow/run.test.ts`: a three-step flow interpolates `{{employeeCode}}` from context and `{{token}}` from an earlier extract, extracts with JSONPath, and evaluates `status`, `equals`, `matches`, `gte`, `rows`, `contains`, `delta` assertions against a stub `execute`; a `wait` step records its seconds without sleeping; a `group` step runs its children in order; a `script` step is refused with an error verdict naming the sandbox unit; an unresolved `{{name}}` is an error verdict, not a crash. `verdict/error-vs-fail.test.ts`: a stub `execute` that throws yields `error`, a failed assertion yields `fail`, and a flow with one of each reports both counts. `verdict/rollup.test.ts`: worst-of folding step → flow → testing type → module → company with the severity order `none < skipped < ok < warn < error < fail`, plus per-severity counts. `scope/hash.test.ts`: the same scope with keys in a different order hashes the same, a different date range hashes differently, and an unknown key is refused. Run `pnpm -s vitest run packages/kernel/test/flow packages/kernel/test/verdict packages/kernel/test/scope` → red → `evidence/U-008/red.log`.
2. `src/verdict/model.ts`: `Severity = 'none' | 'skipped' | 'ok' | 'warn' | 'error' | 'fail'` with `SEVERITY_ORDER`, `worst(a, b)`, `StepVerdict` (`id`, `severity`, `message?`, `durationMs?`, `assertions`), `FlowVerdict`, and `rollup(nodes)` folding children into `{ severity, counts }` at each level (step → flow → testing type → module → company).
3. `src/flow/ast.ts`: types mirroring `flowSchema` exactly (kinds `request | query | validate | wait | group | script`, `needs`, `extract`, the ADR-0003 assertion keys), and `toFlow(doc): { flow, problems }` reusing U-007's `Problem`.
4. `src/flow/interpolate.ts` (`{{name}}` and `{{a.b}}` resolved against scope, manifest variables, fixtures, and earlier extracts; unresolved names are reported, never left in the string), `src/flow/extract.ts` (JSONPath via `jsonpath-plus` with `wrap: false`; zero matches is `undefined` and a named problem), `src/flow/assert.ts` (one evaluator per assertion key; latency uses `lte`/`gte` against the duration the executor returns), `src/flow/run.ts`: `runFlow(flow, context, execute)` where `execute(request) => Promise<StepResult>` is the caller's only I/O; steps run in order, a step whose `needs` did not succeed is `skipped`, an executor throw is `error`, a failed assertion is `fail`.
5. `src/scope/scope.ts`: `Scope` (`env`, `tenant`, `company`, `user`, `dateFrom`, `dateTo`), `scopeHash(scope)` on U-007's `canonicalJson` + Web Crypto SHA-256, refusing unknown keys. Extend `src/index.ts` with the new exports, keeping every U-007 export in place.
6. Green: the same vitest command → `evidence/U-008/test.log`; `pnpm -s typecheck`, `pnpm -s lint`, `node tool/check-boundaries.mjs`; `bash tool/gate.sh --fast` → `evidence/U-008/gate.log`.

## Verification
- `vitest packages/kernel/test/flow packages/kernel/test/verdict packages/kernel/test/scope` red before, green after → `evidence/U-008/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-008/gate.log`

## Progress
2026-09-09 16:35 · ready · set by /build on the owner's instruction (U-007 merged)
2026-09-09 16:38 · intake · brief ok; status ready set in this branch on the owner's instruction (U-007 merged)
2026-09-09 16:38 · explore · findings recorded; 2 non-blocking questions decided here because no ADR pins them: (1) severity order for worst-of rollup is none < skipped < ok < warn < error < fail — a fail is a confirmed product defect, an error is an unknown (source down, architecture §6), and the rollup also returns counts per severity so the UI can show 'source down' separately from '1 failing · 4 warn'; (2) scopeHash covers env, tenant, company, user, dateFrom, dateTo only — the run-coalescing key also needs the target (flow|module|company|suite + id), which the service unit composes, because two different flows in one scope must not join the same run. Also decided: latency is asserted with lte/gte against the duration the execute callback returns, never Date.now() inside the kernel (purity); a script step is refused with an error verdict naming the sandbox unit (ADR-0003's isolated-vm is not in this unit)
2026-09-09 16:38 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-008-kernel-flow-model (deps installed by wt.sh)
2026-09-09 16:43 · build · gate --fast green at b01c1bc; red.log shows runFlow/rollup/scopeHash missing before, test.log 19/19 after; typecheck, lint, boundaries clean. Decisions recorded while building: delta asserts |actual - equals| <= delta (ADR-0003 names the keyword but not its arithmetic); counts tally direct children, so a company counts modules, not leaves — one of my own rollup expectations encoded the other reading and was corrected with a comment naming the semantic; a group's verdict is the worst of its children and its children hang off step.steps
2026-09-09 16:45 · verify · evidence complete: summary.json 5/5 pass at a7ea1a1, full gate green (22 stages), per-suite logs saved
2026-09-09 16:49 · review · adr-reviewer pass (1 should, 3 notes), all addressed in round 1. The should found a real defect: contains and delta were untested, and writing the tests showed delta was parsed as a plain equals (equals sorts first in ASSERT_KINDS) so the tolerance never applied — fixed, delta now wins when both keys are present. Also carried step.name, flow.description and flow-level variables through the AST (flow variables sit under pack variables in the bag), and replaced a mis-titled test with one that genuinely produces an error and a fail together. 34 kernel tests green
