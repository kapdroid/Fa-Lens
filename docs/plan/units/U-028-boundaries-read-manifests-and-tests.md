---
id: U-028
title: The boundary check reads package manifests and test imports, not only source
status: in_progress
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
1. Tests first (red): extend `selftest` with a `putManifest(pkg, deps)` helper beside the existing `put`, and add three cases — a package whose `package.json` names a package its row forbids fails even though no source imports it; a forbidden import that appears only under `test/` fails; and third-party keys in `dependencies` or `devDependencies` are ignored, so a package may depend on anything that is not `@falens/*`. Run `node tool/check-boundaries.mjs selftest` → the three fail → `evidence/U-028/red.log`.
2. Implement in `checkBoundaries`: for each package read its `package.json` and report every `@falens/*` key outside its row as `<pkg> → <dep> is not allowed (packages/<pkg>/package.json)`; and walk `test/` with the same `sourceFiles` and `specifiers` the source walk uses, so a test file is held to the same rule as the code it tests. A package with neither `src` nor `test` nor a manifest is skipped as before.
3. Green: `node tool/check-boundaries.mjs selftest` → `evidence/U-028/selftest.log`; `node tool/check-boundaries.mjs` on the repository as it stands → exits 0 → `evidence/U-028/repo.log`; `bash tool/gate.sh --fast` → `evidence/U-028/gate.log`.
4. If the repository check does not exit 0, that is a real boundary violation this unit has surfaced rather than caused: record it in Progress and stop, because fixing a package's dependencies is not this unit's scope.

## Verification
- a temporary manifest edge and a temporary test import, each turning the check red → `evidence/U-028/red.log`
- `bash tool/gate.sh --fast` → `evidence/U-028/gate.log`

## Progress
2026-09-09 · draft · created from U-014, where exactly this mistake was made and the checker did not catch it.
2026-09-09 19:24 · ready · set by /build on the owner's instruction
2026-09-09 19:26 · intake · brief ok; status ready set in this branch on the owner's instruction
2026-09-09 19:26 · explore · findings recorded; 0 blocking. Confirmed every manifest edge in the tree today is inside its row, so turning the check on should leave the gate green — evidence will show it rather than assume it. Decisions: a manifest violation reads '<pkg> → <dep> is not allowed (packages/<pkg>/package.json)', matching the arrow format the import message already uses; only @falens/* keys are considered, so third-party devDependencies cannot produce a false positive; optionalDependencies is out by the letter of the unit; packs/ stays outside the walk, since it is not under packages/ and has no row
2026-09-09 19:26 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-028-boundaries-manifests
