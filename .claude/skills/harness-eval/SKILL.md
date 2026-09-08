---
name: harness-eval
description: Re-runs the FA Lens harness evaluation units (E-001…E-005) through the build loop and records pass/fail with evidence in docs/orchestration/evals.md. Use when skills, agents, hooks, AGENTS.md, or the gate changed, after a model change, or when a human says "/harness-eval".
disable-model-invocation: true
argument-hint: "[E-xxx ...]"
---

# Harness evals

The loop is a product too. These five small real tasks prove it still works end to end. Run them the same way a real unit runs, and grade the harness on the end state, not on effort.

Eval units and their last recorded results:

!`node tool/check-units.mjs >/dev/null 2>&1 && grep -h -m1 '^title:' docs/plan/units/E-*.md | sed 's/^title: /  - /'; echo; echo "recorded results:"; sed -n '/<!-- results:start -->/,/<!-- results:end -->/p' docs/orchestration/evals.md 2>/dev/null | grep '^|' | tail -n +3 || true`

## Procedure

For each eval unit named in `$ARGUMENTS` (default: all `E-xxx` with `status: ready` or `done`):

1. If the unit is `done` from a previous run, reset it for this eval: check out a fresh worktree via `/build`'s isolate step and treat the unit as `ready` for the duration of the eval (do not edit the committed unit file's status on main).
2. Run `/build E-xxx` exactly as a real unit, including reviewers. Do not skip states because "it is only an eval".
3. Grade the **harness**, separately from the unit's own DoD:
   - `pass`: the loop reached state 7 with every DoD item evidenced, reviewer verdicts recorded, and no human intervention beyond the defined checkpoints.
   - `fail`: any state was skipped, any evidence was asserted rather than produced, a hook or gate did not fire when it should have, or the loop needed a workaround.
4. Record the result. Until E-005 lands, append a row to the table between the markers in `docs/orchestration/evals.md` (date, unit, harness verdict, sha, note). After E-005, use `node tool/evals.mjs record …` and `render`.
5. Do not open PRs for eval worktrees unless the eval unit produces real value (E-001 and E-004 do); say which ones you opened.

Report: a table of unit → harness verdict → one-line reason, and the list of harness defects found (each becomes a `kind: harness` unit). A harness change is complete only when all five are `pass`.
