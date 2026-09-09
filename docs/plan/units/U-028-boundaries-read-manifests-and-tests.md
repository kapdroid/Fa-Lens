---
id: U-028
title: The boundary check reads package manifests and test imports, not only source
status: draft
tier: 1
kind: harness
depends_on: []
allowed_files:
  - tool/check-boundaries.mjs
  - tool/gate.sh
adrs: [ADR-0001, ADR-0011]
design: []
dod:
  - "`node tool/check-boundaries.mjs selftest` covers a package whose package.json depends on a package its row forbids, and fails on it even when no source file imports it"
  - "the same selftest covers a forbidden import that appears only under a package's test folder, and fails on it"
  - "`node tool/check-boundaries.mjs` exits 0 on the repository as it stands"
  - "bash tool/gate.sh --fast is green"
evidence: [red.log, gate.log]
estimate: S
owner:
---

# U-028 · The boundary check reads package manifests and test imports, not only source

## Scope
U-014 added `@falens/service` to `packages/control`'s dependencies, which reverses the direction docs/architecture.md §2 sets, and the boundary check passed: it reads `packages/*/src` only, so neither a manifest edge nor a test-file import is visible to it. A rule that a person has to remember is not a rule the gate keeps. This unit teaches `check-boundaries` to read each package's `dependencies` and `devDependencies` and to walk `test/**` as well as `src/**`, with selftest cases for both.

## Out of scope
No change to the dependency table itself. No new gate stage: the existing `boundaries` stage does the extra work.

## Plan
(written by /build)

## Verification
- a temporary manifest edge and a temporary test import, each turning the check red → `evidence/U-028/red.log`
- `bash tool/gate.sh --fast` → `evidence/U-028/gate.log`

## Progress
2026-09-09 · draft · created from U-014, where exactly this mistake was made and the checker did not catch it.
