---
id: U-002
title: Render the nine per-tab empty states in the prototype
status: in_progress
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
1. Red first: run the DoD-1 grep (the nine sentences from `screens.md`, fixed-string, one `grep -qF` each, count hits) against `docs/design/prototype/index.html` → prints 0 → `evidence/U-002/red.log`.
2. Data: add `EMPTY`, a map tab → `{s, a}` holding the nine sentences and their primary-action labels verbatim from `screens.md` (Module page → Empty states per tab), plus the sync-pack Flows variant (`No chains defined for this company yet.` → `New chain`). For a non-van module the sentence's scope words `Van Sales` are replaced by the module name at render time; the literals stay verbatim in the file.
3. Trigger: `S.empty` (boolean, default false). `bootFromHash` accepts `#/module/<id>/<tab>/empty`; tab clicks keep the suffix in `history.replaceState`; the module header `.right` gets a ghost `sm` toggle `Show empty state` / `Show data` next to Share that flips `S.empty` and re-renders. No new tokens.
4. Render: in `renderModule`, when `S.empty` is true, `emptyState(v, m)` renders instead of the tab function: the "inside a card" placement from `components.md` (card title = tab name stays), then a centered vertical stack `.empty` with an optional 20px icon in `text-faint`, one sentence at `--fs-base` in `text-dim` max 60ch, and one `btn accent` whose label is the action (accent on all nine because every module header already owns the primary `runBtn`; never `primary`). Enters with the existing `reveal` motion; tokens only (`--sp-*`, `--fs-base`, `--text-dim`, `--text-faint`). CSS: one `.empty` rule block next to `.dempty`.
5. Green: DoD-1 grep prints 9 → `evidence/U-002/grep.log`; `bash tool/gate.sh --fast` (prototype-parses, tokens-in-sync) green → `evidence/U-002/gate.log`. Manual check in the browser via the toggle on each of the nine tabs: sentence + one accent button, header primary still present → `evidence/U-002/screens/` (one screenshot per tab if the browser is available; otherwise the rendered HTML text per tab via node). Commit `U-002: nine per-tab empty states in the prototype`.

## Verification
- Grep for the nine sentences from `screens.md`'s empty-state table (verbatim) inside `docs/design/prototype/index.html` prints 9.
- `bash tool/gate.sh --fast` is green → `evidence/U-002/gate.log`.
- Manual: switch each of the nine tabs to its empty state in the prototype and confirm the button variant matches the header-primary rule (accent when the header owns the primary for that scope).

## Progress
2026-09-09 · draft · created as a follow-up from E-003 (docs/plan/units/E-003-design-contract-empty-state-copy.md), which specified the copy but explicitly left prototype rendering out of scope.
2026-09-09 11:29 · intake · brief ok (status ready set in PR #8 on the owner's instruction; intake run from that branch's worktree); tier 2 checkpoint: the owner delegated the human steps ('do on behalf of me'), so the plan is approved on their behalf and the fact is recorded here
2026-09-09 11:29 · explore · findings recorded; 2 non-blocking questions → decided: empty state is reachable by a header toggle (ghost sm button 'Show empty state') and by the deep link #/module/<id>/<tab>/empty (S.empty, no collision with S fields); sync module gets the same nine states except Flows uses screens.md's sync variant. All nine CTAs are accent because every module header already carries the primary runBtn (components.md EmptyState rule)
2026-09-09 11:29 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-002-prototype-empty-states
