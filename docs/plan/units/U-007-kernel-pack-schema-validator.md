---
id: U-007
title: Kernel pack schema and validator with content hash
status: review
tier: 1
kind: kernel
depends_on: [U-006]
allowed_files:
  - packages/kernel/src/pack/**
  - packages/kernel/src/index.ts
  - packages/kernel/test/pack/**
  - packages/kernel/package.json
  - pnpm-lock.yaml
adrs: [ADR-0010, ADR-0003, ADR-0013, ADR-0015]
design: []
dod:
  - "`vitest packages/kernel/test/pack` fails without the validator and passes with it: the valid fixture pack is accepted, and each invalid fixture (missing variable, unreachable flow step, unknown rule type, credential value instead of a vault reference, server name inside a module pack) is rejected with a message naming the JSON path"
  - "`packages/kernel/package.json` declares only the ADR-0015 libraries (ajv, ajv-formats, yaml, jsonpath-plus) as dependencies, a test packages/kernel/test/pack/deps.test.ts fails when another key appears, and `node tool/check-boundaries.mjs` exits 0"
  - "`hashPack()` returns the same hash for the same pack content published twice and a different hash when one byte changes (test in packages/kernel/test/pack/hash.test.ts)"
  - "bash tool/gate.sh --fast is green"
evidence: [test.log, gate.log]
estimate: M
owner:
---

# U-007 · Kernel pack schema and validator with content hash

## Scope
Packs are data (ADR-0010): a folder with a manifest, flows (ADR-0003 YAML), rules (the declarative rule types ADR-0010 names, no code), cases, fixtures, presets, and knowledge notes. This unit gives the kernel the JSON Schemas for each file kind, a `parsePack(files)` that turns raw YAML/JSON text into a typed `Pack`, a `validatePack(pack)` that returns every problem with its path (schema errors, undeclared variables, steps no flow reaches, rule types outside the allowed set, any credential value that is not a `vault://` reference, and any server name outside `packs/_sources`), and `hashPack(pack)` producing the content hash the registry stores at publish. Everything is pure: text in, typed objects and problems out, no file system, no network.

## Out of scope
No registry tables or publish use-case (U-010, service units). No SQL generation for rules (U-009). No flow execution (U-008). The `_sources` catalog keeps its own validator (`tool/check-catalog.mjs`); this unit only recognises that `packs/_sources/**` is the one place server names may appear.

## Plan
1. Tests first (red): `packages/kernel/test/pack/fixtures.ts` builds in-memory packs as `{ 'pack.yaml': '…', 'flows/day-cycle.yaml': '…', 'rules/cycle-balance.yaml': '…', 'cases/day-begin.yaml': '…', 'fixtures/day-begin.json': '…', 'drilldown.yaml': '…', 'presets.yaml': '…', 'catalog.refs.yaml': '…', 'knowledge/cycles.md': '…' }`: one valid pack plus five invalid variants (undeclared `{{variable}}`; a step defined but never reached by the flow's `steps` order or any `group`; a rule with type `magic`; a fixture with `password: hunter22` instead of a `vault://` reference; a `server: mars-sql01.database.windows.net` key in a rule). `packages/kernel/test/pack/validate.test.ts` asserts the valid pack yields no problems and each invalid one yields a problem whose `path` names the file and JSON path and whose message says why. `hash.test.ts` asserts `hashPack` is stable across two parses and changes when one byte of a flow changes. `deps.test.ts` reads `packages/kernel/package.json` and fails when `dependencies` holds a key outside ajv, ajv-formats, yaml, jsonpath-plus (ADR-0015). Run `pnpm -s vitest run packages/kernel/test/pack` → red (modules missing) → `evidence/U-007/red.log`.
2. Schemas under `packages/kernel/src/pack/schemas/`: `pack.schema.json` (id, name, category, version, kind module|sync, tabs, variables), `flow.schema.json` (`$schemaVersion`, steps `request | query | validate | wait | group | script` with `extract` and the ADR-0003 assert vocabulary `status, schema, equals, lte, gte, rows, contains, matches, delta`), `rule.schema.json` (types `uniqueness | presence | field_match | aggregate_match | chain | custom_check`, source by logical name only), `case.schema.json` (kinds `happy | negative | security | boundary | manual`), `drilldown.schema.json`, `presets.schema.json`, `catalog-refs.schema.json`. Fixtures are free JSON.
3. `parse.ts`: `parsePack(files: Record<string, string>): { pack: Pack; problems: Problem[] }` using `yaml.parse` per file by its path pattern; a YAML error becomes a problem at that path. `validate.ts`: `validatePack(pack): Problem[]` runs Ajv (2020 draft, `allErrors`, ajv-formats) per document and adds the semantic checks: undeclared variables (`{{name}}` resolved against manifest variables, scope names `env tenant company user dateFrom dateTo`, fixture names, and earlier `extract` names in the same flow), unreachable steps, credential values (keys matching `password|secret|token|apikey|connection` whose value is not `vault://…`), server names (keys `server|host|hostname` or values matching a hostname pattern) anywhere in a module pack. `hash.ts`: canonical JSON (sorted keys, stable arrays) of the parsed pack, SHA-256 via `globalThis.crypto.subtle`, hex string; `hashPack(pack): Promise<string>`. `packages/kernel/src/index.ts` re-exports `parsePack`, `validatePack`, `hashPack`, and the types. `pnpm add` the four ADR-0015 libraries to `packages/kernel` (lockfile update is part of the diff).
4. Green: `pnpm -s vitest run packages/kernel/test/pack` → `evidence/U-007/test.log`; `pnpm -s typecheck`, `pnpm -s lint`, `node tool/check-boundaries.mjs` green; `bash tool/gate.sh --fast` → `evidence/U-007/gate.log`. Commit in steps: tests (red), schemas, parse/validate/hash, evidence.

## Verification
- `vitest packages/kernel/test/pack` red before, green after → `evidence/U-007/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-007/gate.log`

## Progress
2026-09-09 15:57 · ready · set by /build on the owner's instruction (PR #16 merged); flip lives in the unit branch so it cannot collide with the unit PR
2026-09-09 15:58 · intake · brief ok; status ready set in this branch on the owner's instruction (PR #16 merged). Kernel dependency conflict (ADR-0001 zero deps vs ADR-0003 JSON Schema + JSONPath in the kernel) resolved by proposing ADR-0015 (pure, I/O-free libraries: ajv, ajv-formats, yaml, jsonpath-plus) in this branch; the owner accepts it by merging, or says no and U-007 hand-rolls instead
2026-09-09 16:01 · explore · findings recorded; the 'blocking' question (ADR-0015 accepted?) is already answered above: it is proposed in this branch and the owner accepts it by merging. Decisions: fixtures are in-memory file maps in the tests (no packs/van-sales exists yet); parsePack takes a {path: text} map so the kernel does no I/O; hashPack uses Web Crypto (globalThis.crypto.subtle, async, browser-loadable) not node:crypto; type-only imports use import type (eslint consistent-type-imports). follow-up: docs/architecture.md §2 kernel row says 'Depends on: nothing' — a docs unit updates it to cite ADR-0015 (outside allowed_files here)
2026-09-09 16:01 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-007-kernel-pack-schema (pnpm install done)
2026-09-09 16:02 · plan · spec-checker fail #1: pnpm add rewrites pnpm-lock.yaml, which allowed_files did not grant → added pnpm-lock.yaml to allowed_files (contract fix). follow-up (harness): tool/check-allowed.mjs should always allow pnpm-lock.yaml, since any unit that adds a dependency touches it
2026-09-09 16:06 · build · gate --fast green at 6d40e26; red.log: parsePack is not a function before; test.log 11/11 after; typecheck/lint/boundaries green. Gotchas: the gate's typecheck includes test files, so red tests cannot be committed alone (tests + implementation land in one commit, red.log is the evidence); ajv and ajv-formats are CommonJS — under NodeNext use ajv's named export and unwrap ajv-formats' .default; schemas are draft-07 objects in a .ts module because resolveJsonModule is off in tsconfig.base (ADR-0015 wording adjusted)
2026-09-09 16:08 · verify · evidence complete: summary.json 4/4 pass at 497b166, full gate green (22 stages), deps guard red/green shown
2026-09-09 16:11 · review · adr-reviewer pass (2 should, 4 notes). fixed: rule type custom-check spelled as in ADR-0010; gate-fast.log added; unreachable message says the step can never run. answered: architecture.md kernel row → docs follow-up (below); ADR README row is always-allowed; loose additionalProperties on rule/case schemas deliberate for v1. follow-up: docs unit updates docs/architecture.md §2 kernel row to cite ADR-0015 and corrects ADR-0001's check-boundaries.ts filename. follow-up: tighten rule/case/drilldown schemas (additionalProperties false) once the van-sales pack fixes the shapes
2026-09-09 16:12 · pr · https://github.com/kapdroid/Fa-Lens/pull/18
