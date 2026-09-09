---
id: E-003
title: Specify empty-state copy for every module tab in the design contract
status: done
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
1. Check first (red): `grep -c '^| \(Overview\|APIs\|Cases\|Flows\|Validations\|Load\|Runs\|Data\|Knowledge\) |' docs/design/screens.md` → expect 0 today; save to `evidence/E-003/red.log`. `grep -c '^## EmptyState' docs/design/components.md` → 0.
2. `docs/design/screens.md`: under "Module page (S1–S8 share this frame)" add a table `Tab · Empty state (one sentence) · Primary action` with exactly nine rows in tab order. Reuse the three existing sentences verbatim (Overview, Cases, Flows); write six new ones (APIs, Validations, Load, Runs, Data, Knowledge) in sentence case with plain verbs; each action label names what happens (e.g. `Import Postman collection`, `Run cycle reconciliation`, `Export k6 script`, `Run smoke flow`, `Add test user`, `Sync from ADO`).
3. `docs/design/components.md`: add `## EmptyState` after Skeleton: anatomy (icon optional 20px `text-faint`, one sentence `--fs-base` `text-dim` max 60ch, one primary or accent button), tokens, placement variants (inside a table region, inside a card, page banner) all sharing the rule "one sentence + one action, never two", and the note that copy comes from the screens.md table.
4. Green: re-run step-1 greps (expect 9 and 1) → `evidence/E-003/green.log`; `node tool/check-docs.mjs`; `bash tool/gate.sh --fast` → `evidence/E-003/gate.log`.
5. Commit `E-003: empty-state copy table + EmptyState component`; evidence-collector; adr-reviewer + design-reviewer in parallel (design-review.json is DoD evidence).
follow-up: prototype/index.html has no per-tab empty-state rendering; a later UI unit must render these nine states from the table (not in allowed_files here).

## Verification
- `grep -c '^| \(Overview\|APIs\|Cases\|Flows\|Validations\|Load\|Runs\|Data\|Knowledge\) |' docs/design/screens.md` prints 9 → `evidence/E-003/green.log`
- `node tool/check-docs.mjs` and `bash tool/gate.sh --fast` → `evidence/E-003/gate.log`
- design-reviewer verdict → `evidence/E-003/design-review.json` (this unit exists to exercise the UI review path)

## Progress
2026-09-09 04:59 · explore · findings: 3 tabs already have empty copy (Overview, Cases, Flows), 6 need new; no EmptyState component yet; prototype has no per-tab empty rendering (follow-up); question 'who verifies 9 tabs' answered by adding a grep check to Verification (9 rows) + design-reviewer
2026-09-09 04:59 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/E-003-empty-state-copy
2026-09-09 05:03 · plan · spec-checker pass (grounded rerun). CHECKPOINT: tier 2 — plan needs human approval before build (state 4). Resume with /build E-003.
2026-09-09 09:56 · plan · human approved the plan (owner: 'baki chije bhi complete karo 1,2,3') → building
2026-09-09 09:56 · build · gate --fast green at 1f9acb7; red.log (0,0) → green.log (9,1)
2026-09-09 10:01 · verify · evidence complete: summary.json 4/4 pass, full gate green
2026-09-09 10:01 · review · adr-reviewer pass; design-reviewer pass with 1 should + 2 notes → all fixed in the same round (CTA accent rule, Table→EmptyState reference, 'New chain' label)
2026-09-09 10:02 · pr · https://github.com/kapdroid/Fa-Lens/pull/3
