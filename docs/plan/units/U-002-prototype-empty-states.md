---
id: U-002
title: Render the nine per-tab empty states in the prototype
status: ready
tier: 2
kind: ui
depends_on: [E-003]
allowed_files:
  - docs/design/prototype/index.html
adrs: [ADR-0007]
design: [screens.md#Empty states per tab, components.md#EmptyState]
dod:
  - "prototype renders each of the nine tab empty states when the module has no data (grep for the nine sentences from screens.md in index.html prints 9)"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log]
estimate: S
owner: harness
---

# U-002 · Render the nine per-tab empty states in the prototype

## Scope
`docs/design/screens.md` (Module page → "Empty states per tab", landed in E-003) defines one sentence and one primary action for each of the nine module tabs (Overview, APIs, Cases, Flows, Validations, Load, Runs, Data, Knowledge), and `docs/design/components.md` defines the `EmptyState` component's anatomy and CTA-variant rule. The prototype (`docs/design/prototype/index.html`) currently has no per-tab empty-state rendering: switching to a tab with no data does not show the `EmptyState` component. This unit wires the nine table rows into the prototype so each tab, when the module has no data, renders its `EmptyState` per the component spec (icon optional, one sentence max 60ch, one button — `accent` when the page header already carries a primary for the same scope, `primary` only when it doesn't).

## Out of scope
No changes to `screens.md` or `components.md` (copy and component spec are settled in E-003); no new tokens or motion; no real data wiring beyond what's needed to trigger the empty state (an "empty" fixture/flag is enough).

## Plan
(written by /build in state 2)

## Verification
- Grep for the nine sentences from `screens.md`'s empty-state table (verbatim) inside `docs/design/prototype/index.html` prints 9.
- `bash tool/gate.sh --fast` is green → `evidence/U-002/gate.log`.
- Manual: switch each of the nine tabs to its empty state in the prototype and confirm the button variant matches the header-primary rule (accent when the header owns the primary for that scope).

## Progress
2026-09-09 · draft · created as a follow-up from E-003 (docs/plan/units/E-003-design-contract-empty-state-copy.md), which specified the copy but explicitly left prototype rendering out of scope.
2026-09-09 11:26 · ready · set by /build on the owner's instruction (2026-09-09)
