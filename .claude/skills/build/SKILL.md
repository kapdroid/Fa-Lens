---
name: build
description: Runs one FA Lens work unit end to end through the build loop (intake → explore → isolate → plan → build → verify → review → PR → memory) with checkpoints, evidence files, and stop conditions. Use when a human says "build U-012", "/build E-001", or asks to implement a unit from docs/plan/units.
disable-model-invocation: true
argument-hint: <unit-id>
---

# Build a unit

You are operating autonomously on one unit. The user is not watching in real time; asking "shall I…?" blocks the work. Proceed on reversible steps, stop only at the checkpoints below or on a stop condition, and when you stop, say exactly what a human must decide.

The unit's request sets the scope, and the scope is the deliverable: do not narrow, widen, or swap it. Follow-ups you notice go into `## Progress` as a line starting with `follow-up:`; they become new units later, not commits here.

Evidence over assertion: before you report a state as done, check the claim against a tool result from this session (a log in `evidence/<id>/`, a test run, a gate line).

Reference: `docs/orchestration.md` (states, tiers, stop conditions) and `docs/orchestration/best-practices.md` (why). Read them once if this is your first unit in this session.

## Intake (state 0)

Unit brief for `$ARGUMENTS`:

!`node "${CLAUDE_SKILL_DIR}/scripts/intake.mjs" $ARGUMENTS 2>&1 || true`

If the brief above says `INTAKE FAILED`, stop and report the reason. Otherwise note the tier, the allowed files, the DoD, and the resume point. If the resume point names a state later than 0, continue from that state instead of starting over.

## Explore (state 1)

Launch the `explorer` agent with the absolute path of the unit file and the repository root. While it runs, do nothing else that would need its answer. When it returns, append its findings to the unit's `## Progress` via:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/progress.sh" <id> explore "findings recorded; N open questions"
```

Stop condition: any question marked **blocking**. Write it into Progress and end your turn with the question.

## Isolate (state 2)

```bash
WT=$(bash tool/wt.sh add <id> <slug>) && cd "$WT" && echo "<id>" > .falens-unit && bash "${CLAUDE_SKILL_DIR}/scripts/progress.sh" <id> isolate "worktree $WT"
```

All further work, including writing the plan into the unit file, happens in `$WT`; the main checkout stays untouched. Tell the user the path once.

## Plan (state 3)

Write the `## Plan` section of the unit file: numbered steps, tests first, then implementation, then evidence. Every DoD item maps to at least one step. Only files inside `allowed_files`. Keep it to what the unit asks; the right amount of complexity is the minimum needed.

Then launch the `spec-checker` agent with the **absolute path** of the unit file inside `$WT` (not the main checkout's copy). On `fail`, fix the plan and run it once more. A second `fail` is a stop condition.

Checkpoint: for **tier 2 and 3**, commit the plan (`<id>: plan`) and end your turn here with the plan summarized in five lines and ask the human to approve. For tier 1, commit the plan and continue.

## Build (state 4)

1. Write the failing tests first and run them; save the red output to `evidence/<id>/red.log`. A test that already passes proves nothing; fix the test.
2. Implement in the smallest steps that keep the tree buildable. Commit as you go: `git commit -m "<id>: <what changed>"`.
3. Run `bash tool/gate.sh --fast` until green. Two red gates after fixes is a stop condition.
4. `progress.sh <id> build "gate --fast green at <sha>"`.

Trust the existing code and tests; do not refactor, add features, or tidy beyond the unit. Report a pre-existing bug as a `follow-up:` line, do not fix it here.

## Verify (state 5)

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/verify.sh" <id>
```

Then launch the `evidence-collector` agent with the unit id and `$WT`. It returns `evidence/<id>/summary.json`. Any `fail` or `unverifiable` item sends you back to state 4 once; a second time is a stop condition. `progress.sh <id> verify "evidence complete"`.

## Review (state 6)

Launch in **one message**, in parallel: `adr-reviewer` (always), `design-reviewer` (when `kind: ui` or files under `docs/design`, `packages/web`, `packages/ui`), `adapter-safety-reviewer` (when tier 3). Give each the unit id and `$WT`. Save each verdict to `evidence/<id>/review-<agent>.json`.

Triage every item: fix `block` and `should` items, or answer them in Progress with a reason. Re-run only the agents that failed. Two fix rounds is the budget; a third disagreement is a stop condition.

For tier 3, then launch `fresh-eyes` with `$WT` and the Scope text; save to `evidence/<id>/fresh-eyes.md`. A scope match of `no` is a stop condition.

## PR (state 7)

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/pr.sh" <id>
```

This pushes the unit branch and opens a PR from the template with the DoD boxes and evidence paths filled in. It never merges. If `gh` is not authenticated or the push is refused, stop and report; do not work around it.

## Memory (state 8)

Launch `memory-scribe` with the unit id, `$WT`, the PR URL, and the review files. It closes Progress and sets `status: review`. Commit its changes on the unit branch and push once more.

Report to the user: unit id, PR URL, evidence folder, reviewer verdicts, follow-ups created. Then end.

## Stop conditions (report, do not work around)

Blocking question · dependency not done · edit needed outside `allowed_files` · gate red twice · DoD item without evidence twice · reviewer disagreement after two rounds · credentials, production writes, or destructive actions needed · scope grew · `gh`/push failure. State the state name, the reason, and the decision you need.

## Budget

At most 6 agent launches for tier 1 and 2, 8 for tier 3 (its mandatory reviewers and fresh-eyes already take six), and 2 fix rounds per unit. Reaching either is a stop, not a retry.
