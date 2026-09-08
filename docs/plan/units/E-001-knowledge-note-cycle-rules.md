---
id: E-001
title: Add the locked Van Sales cycle rules as a knowledge note
status: in_progress
tier: 1
kind: docs
depends_on: []
allowed_files:
  - docs/knowledge/van-sales/cycle-rules.md
  - docs/knowledge/README.md
adrs: [ADR-0010]
design: []
dod:
  - "docs/knowledge/van-sales/cycle-rules.md exists and states the six locked rules (cycle open/close, partial end, additional stock, sales window, approval violation, mapping severity) with their source"
  - "node tool/check-docs.mjs passes (links resolve)"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, check-docs.log]
estimate: S
owner: harness
---

# E-001 · Add the locked Van Sales cycle rules as a knowledge note

## Scope
Create `docs/knowledge/van-sales/cycle-rules.md` (area folder per the memory-scribe convention `docs/knowledge/<area>/<slug>.md`) capturing the Van Sales business rules that were verified from the two artifact tools (cycle reconciliation and mapping validator) and are referenced in `.claude/rules/packs.md`. Add a `docs/knowledge/README.md` index that links it. This is the first file of the knowledge folder the memory-scribe agent will maintain.

## Out of scope
No pack files, no schema, no code. Do not restate the whole artifact-tool spec; six rules with one sentence of "why" each and a source line.

## Plan
1. Red check first: run `test -f docs/knowledge/van-sales/cycle-rules.md && grep -c -E "PureDayStart|Partial|Additional|sales window|violation|warning" docs/knowledge/van-sales/cycle-rules.md` and save the failing output to `evidence/E-001/red.log` (file absent → exit 1). This is the DoD-1 check seen red before the change.
2. Write `docs/knowledge/README.md`: what the folder is (repo-level lessons, one per file, `<area>/<slug>.md`, `Source:` line), how memory-scribe adds to it, and a link to `van-sales/cycle-rules.md`.
3. Write `docs/knowledge/van-sales/cycle-rules.md`: six rules, each as a heading + one sentence of rule + one sentence of why + `Source:` line naming the artifact tool spec and date (2026-09-08 extraction). Rules: (1) cycle opens on approved PureDayStart, closes on approved Complete VanDayEnd; (2) Partial VanDayEnd (LoadType 6) never closes a cycle; (3) AdditionalStock is a mid-cycle top-up, never a boundary; (4) a cycle's sales window is its own first/last event timestamps; (5) a PureDayStart while the previous cycle's End is still pending is an approval violation, and the new cycle still opens; (6) in the mapping validator only beat-distributor ≠ van-distributor is an error, every other broken link is a warning. Vocabulary plain, no codes.
4. Green check: re-run the step-1 command (expect 6 distinct matches, exit 0) → `evidence/E-001/green.log`; `node tool/check-docs.mjs` → `evidence/E-001/check-docs.log`; `bash tool/gate.sh --fast` → `evidence/E-001/gate.log`.
5. Commit `E-001: knowledge note for Van Sales cycle rules`; evidence-collector fills `summary.json`; adr-reviewer runs (ADR-0010).

## Verification
- `node tool/check-docs.mjs` → output saved to `evidence/E-001/check-docs.log`
- `bash tool/gate.sh --fast` → `evidence/E-001/gate.log`
- Manual: the six rules are present (grep for "PureDayStart", "Partial", "Additional", "sales window", "violation", "warning").

## Progress
2026-09-09 04:44 · explore · findings: docs/knowledge does not exist; six rules already in .claude/rules/packs.md; ADR-0010 pack-local knowledge is separate; 1 non-blocking question: flat path vs memory-scribe <area>/<slug> convention → adopting docs/knowledge/van-sales/cycle-rules.md
2026-09-09 04:44 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/E-001-knowledge-cycle-rules
2026-09-09 04:46 · build · gate --fast green at fd7a1ad (pre-commit hook); red.log, green.log, check-docs.log saved
2026-09-09 04:49 · verify · evidence complete: summary.json (3/3 pass), full gate green, red.log + dod1-recheck.log
2026-09-09 04:49 · review · spec-checker pass; adr-reviewer pass (1 note → harness fix: .falens-unit gitignored on main)
