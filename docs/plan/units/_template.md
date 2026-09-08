---
id: U-000
title: One line, imperative, names the outcome
status: draft
tier: 2
kind: service
depends_on: []
allowed_files:
  - packages/service/src/runs/**
  - packages/service/test/runs/**
adrs: [ADR-0002, ADR-0004]
design: []
dod:
  - "pnpm gate green at PR head"
  - "vitest packages/service/test/runs/coalesce.test.ts fails without the change and passes with it"
  - "evidence/U-000/coalesce.log shows 500 concurrent POST /runs → 1 execution"
evidence: [coalesce.log]
estimate: M
owner:
---

# U-000 · Title

## Scope
What this unit delivers, in 3–6 sentences a newcomer can act on. Name the behavior, not the files.

## Out of scope
What a tempted builder must NOT do here (and which unit it belongs to instead).

## Plan
Written by the build skill in state 2, before any code. Tests first.
1. Test: …
2. Test: …
3. Implement: …

## Verification
How the DoD items are checked, with the exact commands. Copy the commands into `evidence/<id>/commands.txt` when run.

## Progress
Append-only log the build skill maintains: `YYYY-MM-DD HH:MM · state · one line`. The last line is the resume point for a new session.
