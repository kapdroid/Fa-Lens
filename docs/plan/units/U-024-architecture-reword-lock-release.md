---
id: U-024
title: Reword architecture.md §4 lock-release language to match ADR-0016
status: draft
tier: 1
kind: docs
depends_on: [U-011]
allowed_files:
  - docs/architecture.md
adrs: [ADR-0016]
design: []
dod:
  - "docs/architecture.md §4 no longer says the worker 'releases the lock'; it describes the scope freeing when the run leaves queued/running, per ADR-0016"
  - "node tool/check-docs.mjs is green"
evidence: [check-docs.log]
estimate: S
owner:
---

# U-024 · Reword architecture.md §4 lock-release language to match ADR-0016

## Scope
ADR-0016 (proposed in U-011) settled a contradiction between ADR-0004 and `docs/architecture.md` §4: the advisory lock is a short gate released by the check-and-insert transaction's commit, not a lease the worker holds and releases on completion. §4 still says the worker "releases the lock" on completion, which is now stale relative to the accepted mechanism. This unit rewords §4 to describe the scope freeing when the run's row leaves `queued`/`running` (including a swept `failed` run), without changing any other content in the file.

## Out of scope
No change to ADR-0016 itself (it stays proposed until a human accepts it). No sweeper implementation — that is a worker-unit concern noted in ADR-0016's consequences, not this doc fix.

## Plan
1. Read docs/architecture.md §4 and docs/adr/0016-run-coalescing-lock-is-short.md.
2. Reword the "worker releases the lock" sentence(s) in §4 to say the run leaving `queued`/`running` frees the scope, citing ADR-0016.
3. Run `node tool/check-docs.mjs` and `bash tool/gate.sh --fast`.

## Verification
- `node tool/check-docs.mjs` → `evidence/U-024/check-docs.log`

## Progress
2026-09-09 · draft · created from U-011's Progress follow-up note (round-1 adr-reviewer finding: architecture §4 still says the worker releases the lock)
