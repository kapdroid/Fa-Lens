---
id: U-001
title: Gate runs the zero-dependency tool tests as a stage
status: in_progress
tier: 1
kind: harness
depends_on: [E-002]
allowed_files:
  - tool/gate.sh
adrs: [ADR-0011]
design: []
dod:
  - "bash tool/gate.sh --fast prints a stage line for tool-tests and runs every tool/test/*.test.mjs"
  - "a deliberately failing test under tool/test/ turns the gate red (evidence/U-001/red.log), removing it turns it green"
  - "bash tool/gate.sh --fast is green"
evidence: [red.log, gate.log]
estimate: S
owner:
---

# U-001 · Gate runs the zero-dependency tool tests as a stage

## Scope
Follow-up from E-002's adr-reviewer: the new test file under tool/test/ is not executed by the gate. Add one stage `tool-tests` to tool/gate.sh that runs every tool/test/*.test.mjs (skips loudly when the folder is empty). No other gate change.

## Out of scope
No new tests, no package.json, no CI wiring.

## Plan
1. Prove the gap first: write a temporary `tool/test/zz-fails.test.mjs` that prints `FAIL deliberate` and exits 1 (scratch only, never committed, outside allowed_files on purpose), run `bash tool/gate.sh --fast` → GREEN although a tool test fails → `evidence/U-001/before.log`.
2. Implement one stage in `tool/gate.sh` after `shell-scripts` (line 23), copying that stage's `bash -c` loop pattern: if `compgen -G "tool/test/*.test.mjs"` matches, `run "tool-tests" bash -c 'for f in tool/test/*.test.mjs; do node "$f" || exit 1; done'`; otherwise `skip "tool-tests" "no tool/test/*.test.mjs yet"` (same loud-skip wording as line 38). No other gate change.
3. Red: with the temporary failing test still present, `bash tool/gate.sh --fast` → RED with the `tool-tests` stage naming `zz-fails` → `evidence/U-001/red.log`. Remove the file.
4. Green: `bash tool/gate.sh --fast` → GREEN, stage line `▸ tool-tests ok` present, `check-units.test.mjs` ran → `evidence/U-001/gate.log`. Skip path: temporarily move `tool/test/check-units.test.mjs` aside, run the gate, restore it → stage prints `skipped (no tool/test/*.test.mjs yet)` → `evidence/U-001/skip.log`. Commit `U-001: gate runs tool/test/*.test.mjs as stage tool-tests`.

## Verification
- add a temporary failing test file, run the gate (red), remove it, run again (green); logs under evidence/U-001/

## Progress
2026-09-09 11:28 · intake · brief ok (status ready set in PR #8 on the owner's instruction; intake run from that branch's worktree)
2026-09-09 11:28 · explore · findings recorded; 2 non-blocking questions → decided: evals.mjs selftest/render --check wiring stays out (scope says one stage, no other gate change; follow-up); docs/orchestration.md:62 stage list goes stale (outside allowed_files; follow-up). Pattern: copy shell-scripts stage (bash -c loop), guard the empty glob with compgen -G, skip loudly like line 38
2026-09-09 11:28 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-001-gate-runs-tool-tests
2026-09-09 11:31 · build · gate --fast green at 222a08d; before.log green-with-failing-test (the gap), red.log RED via tool-tests naming zz-fails, gate.log green with stage ok, skip.log 'skipped (no tool/test/*.test.mjs yet)'. follow-up: docs/orchestration.md §5 gate stage list omits tool-tests (outside allowed_files). follow-up: wire node tool/evals.mjs selftest and render --check into the gate (E-005 follow-up, not this unit's one stage)
2026-09-09 11:33 · verify · evidence complete: summary.json 3/3 pass at e528a0c, full gate green (gate.log)
