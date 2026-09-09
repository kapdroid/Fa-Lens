## Unit
- Unit: `E-001` — `docs/plan/units/E-001-knowledge-note-cycle-rules.md`
- Tier: 1 · Kind: docs
- ADRs checked: [ADR-0010]

## What changed and why
Create `docs/knowledge/van-sales/cycle-rules.md` (area folder per the memory-scribe convention `docs/knowledge/<area>/<slug>.md`) capturing the Van Sales business rules that were verified from the two artifact tools (cycle reconciliation and mapping validator) and are referenced in `.claude/rules/packs.md`. Add a `docs/knowledge/README.md` index that links it. This is the first file of the knowledge folder the memory-scribe agent will maintain.

## Definition of Done (evidence-backed)
- [x] docs/knowledge/van-sales/cycle-rules.md exists and states the six locked rules (cycle open/close, partial end, additional stock, sales window, approval violation, mapping severity) with their source — `evidence/E-001/dod1-recheck.log` (pass)
- [x] node tool/check-docs.mjs passes (links resolve) — `evidence/E-001/check-docs.log` (pass)
- [x] bash tool/gate.sh --fast is green — `evidence/E-001/gate-fast.log` (pass)
- [x] tool/gate.sh at `fd7a1adb7e28239a4446ee8f8821af16d9b28593` — `evidence/E-001/gate.log`

## Reviews
- review-adr-reviewer: **pass** — Docs-only unit correctly scoped to docs/knowledge/**; only issue is the harness's own .falens-unit marker landing in the diff.
- review-spec-checker: **pass** — all 3 DoD items covered; red check precedes writes; files inside allowed_files

## Out of scope noticed
- none

🤖 Generated with [Claude Code](https://claude.com/claude-code) via /build; agents: adr-reviewer,spec-checker
