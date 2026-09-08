---
id: E-002
title: Gate fails on evidence folders that belong to no unit
status: in_progress
tier: 1
kind: harness
depends_on: []
allowed_files:
  - tool/check-units.mjs
  - tool/test/**
adrs: [ADR-0011]
design: []
dod:
  - "node tool/test/check-units.test.mjs fails before the change (orphan evidence dir not detected) and passes after"
  - "node tool/check-units.mjs exits 1 when evidence/X-999/ exists without a unit, exits 0 otherwise"
  - "bash tool/gate.sh --fast is green"
evidence: [test.log, gate.log]
estimate: S
owner: harness
---

# E-002 · Gate fails on evidence folders that belong to no unit

## Scope
`evidence/<id>/` folders must correspond to a unit file. Extend `tool/check-units.mjs` to list `evidence/*` directories and fail when a directory's name is not a known unit id. Add a small zero-dependency test runner under `tool/test/` (node `assert`) with a test that creates a temporary orphan directory, runs the checker, and asserts the exit code; then removes it.

## Out of scope
No changes to the schema, no new gate stages beyond the existing `units` stage, no test framework installation.

## Plan
1. Test first: create `tool/test/check-units.test.mjs` (zero deps: `node:assert`, `node:child_process`, `node:fs`). It resolves the repo root from its own `import.meta.url`, runs `node tool/check-units.mjs` once as a baseline (expects exit 0), then inside `try/finally` creates `evidence/X-999/` with a placeholder file, runs the checker again, asserts exit code 1 and that stderr mentions `evidence/X-999`, and always removes the directory in `finally`. Run it before any change → it fails at the second assertion (checker still exits 0) → save as `evidence/E-002/red.log`.
2. Implement in `tool/check-units.mjs`: after building `ids`, list `evidence/` entries with `withFileTypes`, keep directories only (so `.gitkeep` is ignored), and push `evidence/<name>: no unit <name> found` for any name not in `ids`. No schema change, no new gate stage.
3. Run the test again → passes → `evidence/E-002/test.log`. Run `node tool/check-units.mjs` (clean tree, exit 0) and with a manual `evidence/X-999/` (exit 1) → `evidence/E-002/manual-check.log`.
4. `bash tool/gate.sh --fast` → `evidence/E-002/gate.log`. Commit `E-002: check-units fails on orphan evidence dirs (+ test)`.

## Verification
- `node tool/test/check-units.test.mjs` → `evidence/E-002/test.log` (must show the red run before the change is committed, then green)
- `bash tool/gate.sh --fast` → `evidence/E-002/gate.log`

## Progress
2026-09-09 04:52 · explore · findings: check-units resolves root from import.meta.url; ids Set exists (line 44) → reuse for orphan check; evidence/ has only .gitkeep; no tool/test yet; 2 non-blocking questions (pattern check, .gitkeep filter) → decided: skip non-dirs, report 'evidence/<name>: no unit'
2026-09-09 04:52 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/E-002-orphan-evidence-check
