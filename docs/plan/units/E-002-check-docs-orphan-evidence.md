---
id: E-002
title: Gate fails on evidence folders that belong to no unit
status: ready
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
(written by /build in state 2)

## Verification
- `node tool/test/check-units.test.mjs` → `evidence/E-002/test.log` (must show the red run before the change is committed, then green)
- `bash tool/gate.sh --fast` → `evidence/E-002/gate.log`

## Progress
