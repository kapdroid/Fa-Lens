## Unit
- Unit: `E-002` — `docs/plan/units/E-002-check-docs-orphan-evidence.md`
- Tier: 1 · Kind: harness
- ADRs checked: [ADR-0011]

## What changed and why
`evidence/<id>/` folders must correspond to a unit file. Extend `tool/check-units.mjs` to list `evidence/*` directories and fail when a directory's name is not a known unit id. Add a small zero-dependency test runner under `tool/test/` (node `assert`) with a test that creates a temporary orphan directory, runs the checker, and asserts the exit code; then removes it.

## Definition of Done (evidence-backed)
- [x] node tool/test/check-units.test.mjs fails before the change (orphan evidence dir not detected) and passes after — `evidence/E-002/red.log (fails at c03cc63, pre-change), evidence/E-002/test.log (passes post-change; reconfirmed this run)` (pass)
- [x] node tool/check-units.mjs exits 1 when evidence/X-999/ exists without a unit, exits 0 otherwise — `evidence/E-002/manual-check.log` (pass)
- [x] bash tool/gate.sh --fast is green — `evidence/E-002/gate.log (reconfirmed --fast exit 0 with identical 8 stages GREEN; full bash tool/gate.sh run last and persisted here per evidence-collector protocol)` (pass)
- [x] tool/gate.sh at `4902b92e937a61d6c483fb1968d9189550bbe6d6` — `evidence/E-002/gate.log`

## Reviews
- review-adr-reviewer: **pass** — orphan-evidence check and its zero-dep test are correctly scoped and verified; the test is not yet wired into gate.sh (out of this unit's allowed_files → follow-up)
- review-spec-checker: **pass** — 3/3 DoD items covered; test written and run red before implementation; files inside allowed_files

## Out of scope noticed
-  wire tool/test/*.test.mjs into tool/gate.sh as stage tool-tests (kind harness, tier 1)

🤖 Generated with [Claude Code](https://claude.com/claude-code) via /build; agents: adr-reviewer,spec-checker
