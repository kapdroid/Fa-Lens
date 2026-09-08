---
id: E-003
title: Specify empty-state copy for every module tab in the design contract
status: ready
tier: 2
kind: ui
depends_on: []
allowed_files:
  - docs/design/screens.md
  - docs/design/components.md
adrs: [ADR-0007]
design: [screens.md#S1, components.md#Skeleton]
dod:
  - "docs/design/screens.md lists, for each of the nine module tabs, an empty-state sentence and its primary action, in a single table"
  - "docs/design/components.md gains an 'EmptyState' component entry with anatomy, tokens, and the rule 'one sentence + one action'"
  - "node tool/check-docs.mjs passes"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, design-review.json]
estimate: S
owner: harness
---

# E-003 · Specify empty-state copy for every module tab in the design contract

## Scope
The design contract says "never an empty screen" but only gives examples for some tabs. Add one table to `screens.md` (tab · empty sentence · primary action) covering Overview, APIs, Cases, Flows, Validations, Load, Runs, Data, Knowledge, and a proper `EmptyState` component entry in `components.md`. Copy follows the UX-writing rules already in the contract: plain verbs, sentence case, the action names what happens.

## Out of scope
No prototype changes, no tokens changes, no new motion.

## Plan
(written by /build in state 2)

## Verification
- `node tool/check-docs.mjs` and `bash tool/gate.sh --fast` → `evidence/E-003/gate.log`
- design-reviewer verdict → `evidence/E-003/design-review.json` (this unit exists to exercise the UI review path)

## Progress
