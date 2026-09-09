# The build skill isolates into a worktree before writing the plan

Rule: state 2 of `/build` creates the worktree (`tool/wt.sh add`, `.falens-unit` written) and state 3 writes the `## Plan` section and runs `spec-checker` — in that order, and both happen inside the worktree. The plan is committed before build starts. The original ordering (plan first, in the main checkout, then isolate) let a plan get written and reviewed against the main checkout instead of the worktree the unit would actually build in.
Why: writing the plan before isolating meant the `## Plan` edit briefly touched the main checkout — the thing `AGENTS.md` says must never happen — and the spec-checker had nothing durable to check against once the worktree was created afterward. Fixed on main in `.claude/skills/build/SKILL.md`, `AGENTS.md`, and `docs/orchestration.md` (commit `94e190c`).

# `.falens-unit` is a harness marker, not unit output

Rule: the isolate step writes `.falens-unit` (the unit id) at the worktree root so scripts know which unit a worktree belongs to. It is now in `.gitignore`, and `pr.sh`'s dirty-tree check ignores an untracked `.falens-unit` instead of blocking the PR on it.
Why: before the fix, `.falens-unit` had no gitignore entry, so a builder following "commit what's there" could commit it — E-001 did — landing a harness file outside the unit's `allowed_files` and outside its docs-only scope. `pr.sh` also treated it as a dirty-tree blocker on units that correctly left it untracked. Fixed on main in `.gitignore` and `.claude/skills/build/scripts/pr.sh` (commit `94e190c`). Note: as of this fix, `tool/check-harness.mjs` does not yet contain an automated check for either the gitignore entry or the isolate-before-plan ordering, despite the fix commit's message — a future unit should add one so a regression is caught in the gate, not by re-running the eval.

Source: found and fixed during unit E-001, 2026-09-09.
