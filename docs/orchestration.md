# FA Lens orchestration: how work gets built

This is the operating manual for building FA Lens with Claude Code sessions (and humans). Principles and sources are in `docs/orchestration/best-practices.md`; this file is the mechanism. Status: **accepted 2026-09-09**; harness eval results live in `docs/orchestration/evals.md`.

## 1. Five layers

```
Constitution   AGENTS.md (canonical, short) ← CLAUDE.md imports it · .claude/rules/*.md load by path
Spec           docs/plan/units/U-xxx.md — scope · out of scope · tier · allowed_files · adrs · dod · progress
Loop           /build U-xxx — a state machine (intake → explore → isolate → plan → build → verify → review → PR → memory); scripts for deterministic steps, the model for the open ones
Gates          tool/gate.sh (same everywhere) · Claude hooks (.claude/settings.json) · git hooks · reviewer agents
Memory         unit ## Progress · evidence/<id>/ · ADRs · docs/knowledge · auto-memory
```

## 2. Units

A unit is the only shape of work. `docs/plan/units/U-xxx-slug.md` with frontmatter validated by `tool/check-units.mjs` against `docs/plan/unit.schema.json`:

- `tier` decides human involvement: **1** docs and pure code → PR only · **2** service and UI → plan approval + PR · **3** adapters, auth, anything touching sources → plan approval + mandatory reviewers + PR + a human runs it once on beta.
- `allowed_files` is enforced by the `post-edit` hook: an edit outside it is rejected with a message to write the need into Progress and stop. Always allowed in addition: the unit file itself, `evidence/<id>/**`, the memory layer (`docs/knowledge/**`, new ADR files) that the loop writes in state 8, and `pnpm-lock.yaml` and `pnpm-workspace.yaml`, which pnpm rewrites by itself whenever a unit adds a dependency.
- `dod` items must name a command or a test. "Works correctly" is not a DoD item; `vitest packages/kernel/test/verdict.test.ts passes and fails when the rollup line is reverted` is.
- `status` moves `draft → ready → in_progress → review → done` (or `blocked`). Only a human sets `ready`. `done` means the unit's PR is merged; the field is flipped in the next housekeeping commit, and `intake.mjs` already treats a `review` dependency whose `unit/<id>` branch is merged into `origin/main` as done, so a lagging field never blocks a dependent unit.
- `E-xxx` units are harness evals: small real tasks that prove the loop itself works (see §7).

Create one with `/unit "<one-line outcome>"`; it interviews for the missing facts and refuses vague DoD items.

## 3. The build loop (`/build U-xxx`)

| # | State | Who | Enters when | Leaves when (checked by) | On failure |
|---|---|---|---|---|---|
| 0 | Intake | script `intake.mjs` | unit id given | frontmatter valid, status `ready`, deps `done` | stop, report |
| 1 | Explore | `explorer` agent (read-only) | intake ok | ≤ 1 page findings appended to Progress; open questions listed | blocking question → stop for human |
| 2 | Isolate | script `wt.sh add` | explore done, no blocking question | worktree on `unit/U-xxx` from fresh main; `.falens-unit` written; the main checkout is never edited | |
| 3 | Plan | builder (main session) + `spec-checker` agent | worktree ready | plan written into the unit file **in the worktree**: tests first, files ⊆ allowed_files, every DoD item covered; spec-checker `pass`; plan committed | tier 2/3: human approves before state 4 |
| 4 | Build | builder | worktree ready | failing tests written and seen failing; implementation; `tool/gate.sh --fast` green; commits `U-xxx: …` | gate red twice → stop |
| 5 | Verify | script `verify.sh` + `evidence-collector` agent | fast gate green | full gate green; unit DoD commands run; outputs in `evidence/U-xxx/`; UI units: Playwright scenario + screenshots | any DoD item without evidence → back to 4, max once |
| 6 | Review | `adr-reviewer` · `design-reviewer` (ui) · `adapter-safety-reviewer` (tier 3), in parallel; then `fresh-eyes` (tier 3) | evidence complete | all verdict files `pass` | ≤ 2 fix rounds, then stop for human |
| 7 | PR | script `pr.sh` | reviews pass | branch pushed, PR opened from template with evidence links; never merges | |
| 8 | Memory | `memory-scribe` agent | PR open | Progress closed with PR link, status `review`; knowledge/ADR updates in the same PR | |

Budget per unit: at most 6 review/exploration agent calls (tier 1–2) or 8 (tier 3), and 2 fix rounds; evidence-collector and memory-scribe are loop steps outside the count. When a review rerun would exceed the budget, add a deterministic check to the gate instead and record it. Exceeding either is a stop, not a retry. Every state writes its result to the unit file or `evidence/`, so a new session resumes from the last Progress line.

## 4. Agents (`.claude/agents/`)

| Agent | Model | Tools | Returns |
|---|---|---|---|
| explorer | sonnet | Read, Grep, Glob, Bash (read-only cmds) | findings page: files, symbols, existing tests, risks, open questions |
| spec-checker | sonnet | Read | JSON verdict: DoD coverage, files ⊆ allowed, tests-first present |
| evidence-collector | sonnet | Read, Bash, Write (evidence/ only) | runs DoD commands, saves outputs, JSON summary |
| adr-reviewer | sonnet | Read, Grep, Bash (git diff) | JSON items with ADR id + file:line, verdict |
| design-reviewer | sonnet | Read, Grep, Bash | JSON items vs `docs/design/`, verdict |
| adapter-safety-reviewer | fable | Read, Grep, Bash | JSON items vs ADR-0005/0013/0014, verdict |
| fresh-eyes | fable | Read, Bash (git diff) | one paragraph "what this diff does", scope match yes/no |
| memory-scribe | sonnet | Read, Write (docs/, units) | list of files updated |

Rules for all agents: fresh context, narrow rubric, no `Agent` tool (no spawning), report every finding with severity (the builder triages), never modify code. Reviewers do not review their own output; the builder never grades itself.

## 5. Hooks and gates

- `.claude/settings.json`: `SessionStart` prints branch, active unit, last Progress line, worktree count. `PreToolUse(Bash)` denies pushes to main, force pushes, commits on main outside worktrees, destructive resets, and shell writes to source databases. `PostToolUse(Edit|Write)` checks syntax/schema of the edited file and rejects edits outside `allowed_files`.
- Git hooks (`tool/githooks`, installed by `tool/setup.sh`): `pre-commit` runs `tool/gate.sh --fast`; `pre-push` refuses `main` and non-`unit/`, `chore/`, `docs/` branches.
- `tool/gate.sh`: docs, units, harness, catalog (+ selftest), evals ledger (selftest + rendered table up to date), whitespace, secrets, prototype parse, tokens sync, shell syntax, tool tests (`tool/test/*.test.mjs`); once `package.json` exists: typecheck, lint, boundaries, contract snapshot, unit, integration, e2e. Stages skip loudly, never silently.
- Project default permission mode is `plan`.
- Two human-only escapes exist for bootstrapping a repository, never for unit work: `FALENS_ALLOW_MAIN_COMMIT=1` (commit on main in the root checkout) and `FALENS_BOOTSTRAP_MAIN=1` (the first push of `main` to an empty remote; the pre-push hook refuses it once the remote has a main).

## 6. Stop conditions (always report, never work around)

A blocking question for a human · unit deps not done · edit needed outside `allowed_files` · gate red after two fix attempts · a DoD item that cannot be evidenced · reviewer disagreement after two rounds · any credential, production write, or destructive action needed · scope that grew beyond the unit. The stop message names the state, the reason, and what a human should decide.

## 7. Harness evals (`E-xxx`)

Five small real tasks prove the loop end to end: E-001 docs change · E-002 tool script change with a test · E-003 design-contract tweak (UI reviewer path) · E-004 first pack file (`packs/_sources/catalog.yaml`) · E-005 harness self-check (a new eval unit through the loop). Run them with `/harness-eval` after any change to skills, agents, hooks, or `AGENTS.md`, and after a model change. Results and dates go in `docs/orchestration/evals.md`. A harness change is done when all five pass.

## 8. Parallel work

Units are file-disjoint (`check-units` fails on overlapping active units). Two or three units run in parallel in separate worktrees and separate terminals. Coordination happens through git and unit files, never through shared chat.

## 9. Maintaining the harness

Add a rule only after the same mistake happens twice. Remove a rule when harness evals pass without it. Keep `CLAUDE.md` under the gate budget. Every harness change is itself a unit (kind `harness`) and re-runs the evals.
