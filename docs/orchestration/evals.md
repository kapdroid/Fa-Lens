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
| 2026-09-09 | E-001 | pass | 334daba | after 3 harness fixes; tier 1 docs unit, full loop incl. PR https://github.com/kapdroid/Fa-Lens/pull/1 and memory. Harness defects found and fixed on main: plan was written in the main checkout (Isolate now precedes Plan, enforced by check-harness); .falens-unit marker was committed (gitignored; pr.sh tolerates it); memory-scribe writes under docs/knowledge were outside allowed_files (memory layer now always allowed). First-run agents were seeded general-purpose subagents. |
| 2026-09-09 | E-002 | pass | 4902b92 | tool change with red→green zero-dep test; orphan evidence dir now fails check-units; adr-reviewer should → follow-up U-001. PR https://github.com/kapdroid/Fa-Lens/pull/2. |
| 2026-09-09 | E-003 | pass | 7ae918e | after 1 harness fix; tier 2: stopped at plan-approval checkpoint as designed; owner approved; build → verify → native adr-reviewer + design-reviewer (1 should + 2 notes fixed in-round) → PR https://github.com/kapdroid/Fa-Lens/pull/3 → memory (knowledge note, U-002 draft). Harness defect: first spec-checker run read the main checkout's copy and returned a confident false fail → grounding requirement + absolute worktree paths. |
| 2026-09-09 | E-004 | pass | 6d6835f | after 3 harness fixes; tier 3: checkpoint honored; native explorer surfaced the packs-rule tension; spec-checker correctly failed plan v1; adapter-safety-reviewer round 1 (9 should) and round 2 (8 should) both fixed; fresh-eyes scope match after triage; validator now allow-list first with a 20-case --selftest gate stage; PR https://github.com/kapdroid/Fa-Lens/pull/4. Harness defects: whitespace gate tripped on raw evidence logs (now excluded); tier-3 agent budget of 6 was too small (now 8, review/exploration only); commits blocked by the pre-commit gate left an empty SHA in a progress line (progress.sh now runs after a confirmed commit in the skill text). |
| 2026-09-09 | E-005 | blocked | — | expected; intake refuses: dependency E-002 is not done (PR #2 not merged). Proves the dependency gate; runs once E-002 merges. |
<!-- results:end -->

Note on agent invocation: E-001 and E-002 ran before the project agents were loadable in the session that created them, so their reviewers were general-purpose subagents seeded with the agent files. From E-003 on, the agents ran natively (`subagent_type: adr-reviewer`, `design-reviewer`, `adapter-safety-reviewer`, `fresh-eyes`, `evidence-collector`, `memory-scribe`, `explorer`, `spec-checker`), which is the intended path. The `/build` skill itself has not yet been invoked as a slash command in a fresh session; the state machine was driven by hand following SKILL.md. First item for the next session: `/build E-005` once PR #2 is merged, which exercises the skill natively.
