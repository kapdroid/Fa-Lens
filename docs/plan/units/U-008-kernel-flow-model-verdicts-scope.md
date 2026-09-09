---
id: U-008
title: Kernel flow model, step semantics, verdict rollup, and scope hash
status: draft
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
(written by /build)

## Verification
- `vitest packages/kernel/test/flow packages/kernel/test/verdict packages/kernel/test/scope` red before, green after → `evidence/U-008/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-008/gate.log`

## Progress
