---
id: E-005
title: Record harness eval runs in a machine-readable log and render evals.md from it
status: in_progress
tier: 1
kind: harness
depends_on: [E-002]
allowed_files:
  - tool/evals.mjs
  - docs/orchestration/evals.md
  - docs/orchestration/evals.jsonl
adrs: [ADR-0011]
design: []
dod:
  - "node tool/evals.mjs record E-001 pass 'gate green, note present' appends a JSON line with id, verdict, note, date, sha to docs/orchestration/evals.jsonl"
  - "node tool/evals.mjs render regenerates the results table in docs/orchestration/evals.md from the jsonl (idempotent: running twice produces no diff)"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, render.diff]
estimate: S
owner: harness
---

# E-005 · Record harness eval runs in a machine-readable log and render evals.md from it

## Scope
Harness evals need a ledger of their own. Add `tool/evals.mjs` with two commands (`record`, `render`) and the jsonl file it writes. `evals.md` keeps its prose header and gets a generated table between two marker comments.

## Out of scope
No scheduling, no CI wiring, no charts.

## Plan
1. Test first (red): create `tool/evals.mjs` with the CLI dispatch, exported `record(dir, …)` / `render(dir, …)` functions that throw `not implemented`, and a working `selftest` command (zero deps: `node:assert/strict`, `node:fs`, `node:os`, `node:path`) that works only in a temp dir: it writes a minimal `evals.md` with the two markers, asserts `record` appends exactly one JSON line with `id, verdict, note, date, sha` (verdict limited to pass|fail|blocked, a `|` in the note escaped in the table), asserts `render` writes the table between `<!-- results:start -->` and `<!-- results:end -->` with the prose above and below byte-identical, asserts a second `render` changes nothing, and asserts a bad verdict, a malformed jsonl line, and a missing marker each fail with a message. Run `node tool/evals.mjs selftest` → assertions fail → `evidence/E-005/red.log`.
2. Implement `record <id> <verdict> <note> [--date=YYYY-MM-DD] [--sha=<short>]`: date defaults to today, sha to `git rev-parse --short HEAD` (`—` when git is unavailable); appends one newline-terminated JSON line to `docs/orchestration/evals.jsonl`, creating the file. Exit 2 with a usage line on bad arguments.
3. Implement `render [--check]`: parses the jsonl (blank lines skipped, malformed line → error with its line number), renders `| Date | Unit | Harness verdict | SHA | Note |` rows in ledger order between the markers of `docs/orchestration/evals.md`, leaves everything outside the markers untouched, ends the file with exactly one newline; `--check` exits 1 without writing when the file would change. Run `node tool/evals.mjs selftest` → green → `evidence/E-005/selftest.log`.
4. Seed `docs/orchestration/evals.jsonl` with the five rows already in the table (E-001…E-004 `pass` with their qualifiers moved into the note, E-005 `blocked`, dates and SHAs as today), run `render`, and check the table reads the same. Run `render` a second time and save `git diff --stat docs/orchestration/evals.md` → empty → `evidence/E-005/render.diff`.
5. Evidence and gate: run the literal DoD-1 command `node tool/evals.mjs record E-001 pass 'gate green, note present'`, save the appended line and `git diff` to `evidence/E-005/record.log`, then `git checkout -- docs/orchestration/evals.jsonl` so the committed ledger holds only real runs (the log says so). `bash tool/gate.sh --fast` → `evidence/E-005/gate.log`. Commit as `E-005: …` after each green step. Files touched: `tool/evals.mjs`, `docs/orchestration/evals.jsonl`, `docs/orchestration/evals.md`, `evidence/E-005/**`.

## Verification
- record + render twice, `git diff --stat docs/orchestration/evals.md` after the second render is empty → `evidence/E-005/render.diff`
- `bash tool/gate.sh --fast` → `evidence/E-005/gate.log`

## Progress
2026-09-09 10:57 · intake · brief ok via chore branch intake fix (PR #6): E-002 is review but unit/E-002 merged into origin/main; harness defect recorded there. Second defect: .falens-unit tracked on main → untracked in PR #6, skip-worktree here
2026-09-09 10:57 · explore · findings recorded; 2 open questions. Decided: tests-first satisfied by a selftest command inside tool/evals.mjs (precedent tool/check-catalog.mjs --selftest; tool/test/** not allowed); jsonl is seeded from the five existing rows so history is kept
2026-09-09 10:57 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/E-005-harness-eval-record
2026-09-09 11:00 · build · gate --fast green at 4f85ca3; red.log 8 failing before implementation, selftest.log 8 ok after; render.diff empty on second render; record.log shows the DoD-1 line then reverted
2026-09-09 11:02 · verify · evidence complete: summary.json 3/3 pass at c50b87f, full gate green (gate.log), selftest 8/8 re-run
2026-09-09 11:04 · review · adr-reviewer pass (0 items); recorded E-005's own result with the new tool (6th ledger row) and replaced the stale 'not yet invoked natively' note in evals.md. follow-up: wire node tool/evals.mjs selftest and node tool/evals.mjs render --check into tool/gate.sh as stages (kind harness, tier 1; tool/gate.sh is outside this unit's allowed_files and Out of scope forbids CI wiring). follow-up: E-001..E-004 status flips and the intake merged-dependency rule live in PR #6; the loop still has no step that sets status done after a merge (a wt.sh gc hook or a /unit done command)
