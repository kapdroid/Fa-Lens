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
<!-- results:end -->

Known limitation on first run (2026-09-09): agents in `.claude/agents/` and skills in `.claude/skills/` become natively invocable in the **next** Claude Code session after they are created. The first eval pass therefore drives the state machine manually and seeds general-purpose subagents with the agent files' content; native invocation is verified in the following session and recorded here.
