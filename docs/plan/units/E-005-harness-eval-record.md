---
id: E-005
title: Record harness eval runs in a machine-readable log and render evals.md from it
status: ready
tier: 1
kind: harness
depends_on: [E-002]
allowed_files:
  - tool/evals.mjs
  - docs/orchestration/evals.md
  - docs/orchestration/evals.jsonl
adrs: [ADR-0011]
design: []
dod:
  - "node tool/evals.mjs record E-001 pass 'gate green, note present' appends a JSON line with id, verdict, note, date, sha to docs/orchestration/evals.jsonl"
  - "node tool/evals.mjs render regenerates the results table in docs/orchestration/evals.md from the jsonl (idempotent: running twice produces no diff)"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, render.diff]
estimate: S
owner: harness
---

# E-005 · Record harness eval runs in a machine-readable log and render evals.md from it

## Scope
Harness evals need a ledger of their own. Add `tool/evals.mjs` with two commands (`record`, `render`) and the jsonl file it writes. `evals.md` keeps its prose header and gets a generated table between two marker comments.

## Out of scope
No scheduling, no CI wiring, no charts.

## Plan
(written by /build in state 2)

## Verification
- record + render twice, `git diff --stat docs/orchestration/evals.md` after the second render is empty → `evidence/E-005/render.diff`
- `bash tool/gate.sh --fast` → `evidence/E-005/gate.log`

## Progress
