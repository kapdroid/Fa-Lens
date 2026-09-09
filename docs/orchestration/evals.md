# Harness evals

The build loop (`docs/orchestration.md`) is verified by running five small real units (`docs/plan/units/E-00*.md`) through it and grading the **harness**, not the unit: did every state run, was every DoD item evidenced by a file, did hooks and gates fire, did reviewers return verdicts, did the loop stop where it should. Owner: whoever changes the harness; re-run after any change to skills, agents, hooks, `AGENTS.md`, the gate, or the model.

Grading follows Anthropic's evals guidance: grade the end state; a task two experts would judge differently is a broken task, not a failed run; keep the regression set near 100%.

| Eval | Proves |
|---|---|
| E-001 | docs unit, tier 1: intake → explore → plan → isolate → build → verify → adr-reviewer → PR → memory |
| E-002 | tool change with a red-then-green test; evidence of the red run |
| E-003 | design-contract unit, tier 2: plan approval checkpoint + design-reviewer path |
| E-004 | pack unit, tier 3: adapter-safety-reviewer + fresh-eyes + gate stage addition |
| E-005 | harness unit with a dependency (`depends_on: E-002`): intake refuses until the dependency is done |

<!-- results:start -->
| Date | Unit | Harness verdict | SHA | Note |
|---|---|---|---|---|
| 2026-09-09 | E-001 | pass (after 3 harness fixes) | 334daba | tier 1 docs unit ran intake→memory; PR step in --dry-run (push awaits owner). Harness defects found and fixed on main: plan was written in main checkout (Isolate now precedes Plan, enforced by check-harness); .falens-unit marker was committed (gitignored; pr.sh tolerates it); memory-scribe writes under docs/knowledge were outside allowed_files (memory layer now always allowed). Agents were seeded general-purpose subagents (native invocation needs a new session). |
| 2026-09-09 | E-002 | pass | 4902b92 | tool change with red→green zero-dep test (red.log at c03cc63, test.log after); orphan evidence dir now fails check-units; adr-reviewer pass with 1 should → answered (gate.sh outside allowed_files) and captured as follow-up unit U-001. PR step in --dry-run. |
| 2026-09-09 | E-003 | stopped at checkpoint (expected) | 3a5f20d | tier 2: intake, explore, isolate, plan, spec-checker ran; stopped for human plan approval as designed. Harness defect found: the first spec-checker run read the main checkout's copy of the unit (placeholder plan) instead of the worktree path and returned a confident false `fail`; fixed by requiring the agent to quote the Plan's first line verbatim (grounding) and by passing absolute worktree paths in the skill. Resume with /build E-003 after approval. |
| 2026-09-09 | E-004 | stopped at checkpoint (expected) | cfefc7b | tier 3: intake, explore, isolate, plan, spec-checker ran. Explorer surfaced a real rule tension (.claude/rules/packs.md 'no server names in a pack' vs ADR-0013 catalog) → handled in plan via packs/_sources/README.md + follow-up. Spec-checker run 1 correctly failed the plan (step 3 lacked app_api/dashboard_api); plan fixed; run 2 pass. Stopped for human plan approval as designed; adapter-safety-reviewer + fresh-eyes will run after build. |
| 2026-09-09 | E-005 | blocked (expected) | — | intake refuses: dependency E-002 is not done (its PR is not merged). Proves the dependency gate. |
<!-- results:end -->

Known limitation on first run (2026-09-09): agents in `.claude/agents/` and skills in `.claude/skills/` become natively invocable in the **next** Claude Code session after they are created. The first eval pass therefore drives the state machine manually and seeds general-purpose subagents with the agent files' content; native invocation is verified in the following session and recorded here.
