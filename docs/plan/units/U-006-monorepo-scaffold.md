---
id: U-006
title: Scaffold the pnpm/Turborepo monorepo with the eleven packages, boundary check, and a real gate
status: draft
tier: 1
kind: infra
depends_on: []
allowed_files:
  - package.json
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - turbo.json
  - tsconfig.base.json
  - .npmrc
  - .nvmrc
  - eslint.config.mjs
  - vitest.workspace.ts
  - packages/*/package.json
  - packages/*/tsconfig.json
  - packages/*/src/index.ts
  - packages/*/test/**
  - tool/check-boundaries.mjs
  - tool/gate.sh
  - .gitignore
adrs: [ADR-0001, ADR-0011]
design: []
dod:
  - "`pnpm install --frozen-lockfile` exits 0 on Node 22 or newer and `pnpm -r ls --depth -1` lists the eleven workspace packages from docs/architecture.md §2 (@falens/kernel, adapters, control, service, api, worker, mcp, cli, web, ui, and the packs workspace entry)"
  - "`pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test` each exit 0, and `bash tool/gate.sh --fast` runs the typecheck and lint stages instead of printing `skipped (no package.json yet)`"
  - "`node tool/check-boundaries.mjs` exits 1 while a temporary file under packages/kernel/src imports @falens/adapters (evidence/U-006/boundary-red.log) and exits 0 after the file is removed"
  - "`vitest` runs one smoke test per package (packages/*/test/smoke.test.ts) and every one passes"
  - "bash tool/gate.sh --fast is green"
evidence: [install.log, boundary-red.log, gate.log]
estimate: M
owner:
---

# U-006 · Scaffold the pnpm/Turborepo monorepo with the eleven packages, boundary check, and a real gate

## Scope
The repository has no code yet. Create the pnpm workspace and Turborepo pipeline described in ADR-0001 and docs/architecture.md §2: one package per row of the packages table, each with a `package.json` (name `@falens/<pkg>`, `type: module`, `engines.node >= 22`), a `tsconfig.json` extending `tsconfig.base.json` (strict, ES2022, NodeNext), an `src/index.ts` that exports only a `PACKAGE` constant, and a `test/smoke.test.ts`. Root scripts `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `contract:check` exist (the last three may exit 0 with a "no suites yet" line until later units fill them) so `tool/gate.sh`'s existing `package.json` branch runs unchanged. Write `tool/check-boundaries.mjs`: zero-dependency, reads every `packages/*/src/**/*.ts` import specifier and fails when a package imports one that the dependency table forbids (the table lives in the script, copied from architecture §2; kernel depends on nothing; api never imports adapters; web imports api contract types only). Wire it as a gate stage where architecture already names it.

## Out of scope
No real domain code (U-007 onward). No Docker or Testcontainers wiring beyond the `test:integration` script placeholder (U-010). No Vite app or web build (U-018). No CI pipeline yaml (ADO wiring is a later infra unit). No Stylelint setup (U-018 brings tokens).

## Plan
(written by /build)

## Verification
- `pnpm install --frozen-lockfile` → `evidence/U-006/install.log`
- temporary `packages/kernel/src/zz-bad-import.ts` importing `@falens/adapters` → `node tool/check-boundaries.mjs` exit 1 → `evidence/U-006/boundary-red.log`; remove the file → exit 0
- `bash tool/gate.sh --fast` → `evidence/U-006/gate.log` showing typecheck, lint, boundaries stages `ok`

## Progress
