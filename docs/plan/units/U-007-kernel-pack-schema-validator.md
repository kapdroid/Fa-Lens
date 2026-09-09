---
id: U-007
title: Kernel pack schema and validator with content hash
status: ready
tier: 1
kind: kernel
depends_on: [U-006]
allowed_files:
  - packages/kernel/src/pack/**
  - packages/kernel/src/index.ts
  - packages/kernel/test/pack/**
  - packages/kernel/package.json
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
(written by /build)

## Verification
- `vitest packages/kernel/test/pack` red before, green after → `evidence/U-007/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-007/gate.log`

## Progress
2026-09-09 15:57 · ready · set by /build on the owner's instruction (PR #16 merged); flip lives in the unit branch so it cannot collide with the unit PR
2026-09-09 15:58 · intake · brief ok; status ready set in this branch on the owner's instruction (PR #16 merged). Kernel dependency conflict (ADR-0001 zero deps vs ADR-0003 JSON Schema + JSONPath in the kernel) resolved by proposing ADR-0015 (pure, I/O-free libraries: ajv, ajv-formats, yaml, jsonpath-plus) in this branch; the owner accepts it by merging, or says no and U-007 hand-rolls instead
