@AGENTS.md

# Claude Code specifics
- Skills: `/build U-xxx` runs a unit end to end; `/unit` drafts a new unit file with a machine-checkable DoD; `/harness-eval` re-runs the harness evals. Skills live in `.claude/skills/`.
- Reviewer and helper agents live in `.claude/agents/`; the build skill invokes them by name with narrow rubrics. Do not review your own work; hand it to them.
- Path-scoped rules in `.claude/rules/` load when you touch that area (adapters, UI, packs, docs). Read them when they appear.
- Commands you cannot guess: `bash tool/setup.sh` (once), `bash tool/gate.sh [--fast]`, `bash tool/wt.sh add|list|gc`, `node tool/check-units.mjs`.
- On session start the hook prints the current unit and its last `## Progress` line; resume from there instead of re-exploring.
- When compacting, preserve exactly: the unit id, the current state name, the list of files changed, the failing test names, and open questions for the human.
