---
id: E-001
title: Add the locked Van Sales cycle rules as a knowledge note
status: ready
tier: 1
kind: docs
depends_on: []
allowed_files:
  - docs/knowledge/van-sales-cycle-rules.md
  - docs/knowledge/README.md
adrs: [ADR-0010]
design: []
dod:
  - "docs/knowledge/van-sales-cycle-rules.md exists and states the six locked rules (cycle open/close, partial end, additional stock, sales window, approval violation, mapping severity) with their source"
  - "node tool/check-docs.mjs passes (links resolve)"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, check-docs.log]
estimate: S
owner: harness
---

# E-001 · Add the locked Van Sales cycle rules as a knowledge note

## Scope
Create `docs/knowledge/van-sales-cycle-rules.md` capturing the Van Sales business rules that were verified from the two artifact tools (cycle reconciliation and mapping validator) and are referenced in `.claude/rules/packs.md`. Add a `docs/knowledge/README.md` index that links it. This is the first file of the knowledge folder the memory-scribe agent will maintain.

## Out of scope
No pack files, no schema, no code. Do not restate the whole artifact-tool spec; six rules with one sentence of "why" each and a source line.

## Plan
(written by /build in state 2)

## Verification
- `node tool/check-docs.mjs` → output saved to `evidence/E-001/check-docs.log`
- `bash tool/gate.sh --fast` → `evidence/E-001/gate.log`
- Manual: the six rules are present (grep for "PureDayStart", "Partial", "Additional", "sales window", "violation", "warning").

## Progress
