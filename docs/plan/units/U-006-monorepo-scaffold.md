---
id: U-006
title: Scaffold the pnpm/Turborepo monorepo with the eleven packages, boundary check, and a real gate
status: in_progress
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
  - packs/package.json
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
1. Red first: `bash tool/gate.sh --fast` on the empty tree prints `typecheck/lint/tests skipped (no package.json yet)` → `evidence/U-006/before.log`. Create `tool/check-boundaries.mjs` with the CLI, a `selftest` subcommand (temp dir with a fake `packages/` tree: kernel importing `@falens/adapters` is a violation, api importing `@falens/adapters` is a violation, api importing `@falens/service` is allowed, worker importing adapters allowed, web importing anything but `@falens/api` types is a violation, node: builtins and third-party specifiers ignored) and a `checkBoundaries(root)` that throws `not implemented` → `node tool/check-boundaries.mjs selftest` red → `evidence/U-006/red.log`.
2. Implement `checkBoundaries`: the dependency table copied from docs/architecture.md §2 (kernel: none; adapters: kernel; control: kernel; service: kernel, control, adapters; api: service; worker: service, adapters; mcp: service; cli: service, api; web: api; ui: none), walk `packages/*/src/**/*.ts` and `*.tsx`, read `import`/`export … from` and dynamic `import()` specifiers, flag `@falens/<x>` imports outside the row; print each violation as `package → forbidden (file:line)`, exit 1; selftest green → `evidence/U-006/selftest.log`.
3. Root files: `package.json` (private, `engines.node >=22`, `packageManager pnpm@11`, scripts `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `contract:check`, `gate`, `boundaries`), `pnpm-workspace.yaml` (`packages/*`, `packs`), `turbo.json` (typecheck, lint, test pipelines), `tsconfig.base.json` (strict, ES2022, NodeNext, isolatedModules), `.npmrc` (strict peer deps off, node-linker default), `.nvmrc` = 22, `eslint.config.mjs` (typescript-eslint recommended, flat), `vitest.workspace.ts` (unit project over `packages/*/test/**/*.test.ts`; `test:integration` and `test:e2e` scripts print `no suites yet` and exit 0 until U-010 and the web units add projects; `contract:check` likewise until the service unit), `.gitignore` += `.turbo/`.
4. Packages: for each of kernel, adapters, control, service, api, worker, mcp, cli, web, ui: `package.json` (`@falens/<x>`, private, `type: module`, `main`/`types` on src, workspace deps only as the table allows), `tsconfig.json` extending base, `src/index.ts` exporting `export const PACKAGE = '@falens/<x>' as const`, `test/smoke.test.ts` asserting the constant. `packs/package.json` (`@falens/packs`, private, data only, no scripts, no source).
5. `pnpm install` (writes `pnpm-lock.yaml`) → `evidence/U-006/install.log` with `pnpm -r ls --depth -1`; `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test` green. Boundary red: temporary `packages/kernel/src/zz-bad-import.ts` importing `@falens/adapters` → `node tool/check-boundaries.mjs` exit 1 → `evidence/U-006/boundary-red.log`; remove it. `bash tool/gate.sh --fast` shows typecheck, lint, boundaries, contract stages `ok` → `evidence/U-006/gate.log`. Commit in steps: boundaries tool, root config, packages, lockfile.

## Verification
- `pnpm install --frozen-lockfile` → `evidence/U-006/install.log`
- temporary `packages/kernel/src/zz-bad-import.ts` importing `@falens/adapters` → `node tool/check-boundaries.mjs` exit 1 → `evidence/U-006/boundary-red.log`; remove the file → exit 0
- `bash tool/gate.sh --fast` → `evidence/U-006/gate.log` showing typecheck, lint, boundaries stages `ok`

## Progress
2026-09-09 15:39 · intake · brief ok (status ready set in PR #15 on the owner's instruction; intake run from that branch's worktree)
2026-09-09 15:39 · explore · findings recorded; 2 questions marked blocking, both answered from the texts: (1) ADR-0001 'Node 22 LTS' is the runtime we pin (.nvmrc 22, later the image) while package.json engines >=22 is the floor the DoD names, so a Node 24 machine still builds — no ADR conflict; (2) packs/ becomes a data-only workspace entry (packs/package.json, private, no src) so pnpm -r ls lists eleven as the DoD says. Non-blocking: .gitignore gains .turbo/; root gets a gate script aliasing tool/gate.sh so ADR-0011's pnpm gate exists. tool/test/** is not allowed here → check-boundaries.mjs carries a selftest (precedent). ADR-0001 names tool/check-boundaries.ts; the unit and the gate line already say .mjs (zero-dep rule)
2026-09-09 15:39 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-006-monorepo-scaffold
2026-09-09 15:40 · plan · spec-checker fail #1: the DoD asks for the packs workspace entry but allowed_files did not grant packs/package.json (contract inconsistency from drafting) → added that one path to allowed_files; dropped the validate-script reference to tool/check-catalog.mjs (not in the DoD). Plan otherwise fully covered
