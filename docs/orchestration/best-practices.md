# AI engineering best practices we build on

Gathered 2026-09-09 from live sources (Anthropic engineering posts, Claude Code and Claude platform docs, and practitioner/industry guidance). Each principle carries its source and the **FA Lens rule** it produced. When a rule in this repo seems arbitrary, the reason is here. Re-audit this file when models or tools change: Anthropic itself notes that "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions can quickly go stale."

Sources (short names used below):
- **BEA** Building effective agents — anthropic.com/engineering/building-effective-agents
- **CTX** Effective context engineering for AI agents — anthropic.com/engineering/effective-context-engineering-for-ai-agents
- **MAR** How we built our multi-agent research system — anthropic.com/engineering/multi-agent-research-system
- **TOOLS** Writing effective tools for agents — anthropic.com/engineering/writing-tools-for-agents
- **HARN1** Effective harnesses for long-running agents — anthropic.com/engineering/effective-harnesses-for-long-running-agents
- **HARN2** Harness design for long-running application development — anthropic.com/engineering/harness-design-long-running-apps
- **EVALS** Demystifying evals for AI agents — anthropic.com/engineering/demystifying-evals-for-ai-agents
- **SKILLS** Equipping agents for the real world with Agent Skills — anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills; skill best practices — platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **CC** Claude Code docs: best-practices, memory, sub-agents, hooks, skills, common-workflows, agent-sdk, routines, workflows, scheduled-tasks, agent-teams — code.claude.com/docs/en/…
- **PROMPT** Prompting best practices + model pages (Fable 5.1, Fable 5, Opus 5, Opus 4.8) — platform.claude.com/docs/en/build-with-claude/prompt-engineering/…
- **IND** Industry: agents.md; OpenAI Codex best practices; Cursor rules + agent best practices; AWS Kiro specs; GitHub Spec Kit; SWE-bench Verified; Harper Reed; Simon Willison's agentic-engineering patterns; Böckeler/Fowler "Harness engineering"; Huntley's Ralph loop and its critiques; Addy Osmani; Kubernetes/Django/Ghostty AI-contribution policies.

---

## 1. Architecture of the loop

| Principle (source) | FA Lens rule |
|---|---|
| Prefer predefined **workflows** over open-ended agents; add agency only where steps are truly unpredictable. "Consider adding complexity only when it demonstrably improves outcomes." (BEA) | The build loop is a fixed state machine (`docs/orchestration.md`). Scripts do intake, isolation, gate, evidence, PR. The model decides only inside "explore", "plan", "build". |
| Patterns to pick from: prompt chaining, routing, parallelization, orchestrator-workers, **evaluator-optimizer** (BEA). | Explore = orchestrator-workers (read-only). Review = evaluator-optimizer with bounded rounds (≤ 2). |
| Separate the agent doing the work from the agent judging it; self-evaluation is biased toward praise (HARN2, MAR, PROMPT Fable 5: "fresh-context verifier subagents beat self-critique"). | Builder is the main session. Reviewers are fresh-context subagents with narrow rubrics. The builder never marks its own DoD. |
| Bound work per unit: "one feature per session", effort scaled to complexity, max iterations, hard thresholds (HARN1, HARN2, MAR, BEA). | One unit per worktree per session. Tiers set effort. Stop after 2 fix rounds, 6 agent calls, or any blocking question. |
| Planner stays at product/high level; premature technical detail cascades errors (HARN2). | Unit files state behavior and DoD, not implementation. The plan is written in state 2 by the builder, after exploring. |
| Verify against ground truth, end to end, end state; "grade what the agent produced, not the path" (BEA, HARN1, HARN2, EVALS). | Every unit's DoD names commands and tests. UI units re-enact a prototype scenario in Playwright. Evidence files, not narration. |
| Human at checkpoints and blockers, not everywhere (BEA, Böckeler: direct human input "to where it is most important"). | Humans approve plans for tier 2/3, answer blocking questions, and merge. Nothing else waits on a human. |

## 2. Context engineering

| Principle (source) | FA Lens rule |
|---|---|
| Context is a scarce, degrading resource ("context rot", "attention budget"); aim for "the smallest possible set of high-signal tokens" (CTX). | `CLAUDE.md` is ≤ 80 lines (gate-enforced) and imports `AGENTS.md`; everything else loads just in time. |
| Hybrid loading: stable instructions up front, the rest via lightweight identifiers and just-in-time retrieval (CTX, CC memory). | Path-scoped `.claude/rules/*.md` load when files in that area are touched. Skills load on invocation. Unit files point to ADR ids and design sections instead of inlining them. |
| Externalize memory: plan files, progress notes, feature lists, git history; re-read after resets (CTX, MAR, HARN1, PROMPT agentic). | Each unit has `## Progress` (append-only, last line = resume point). `SessionStart` hook prints it. Compaction instruction in `CLAUDE.md` names what to keep. |
| Sub-agents burn tokens but return distilled summaries; pass references, not full text (CTX, MAR). | Explorer returns ≤ 1 page; reviewers return JSON verdicts; evidence lives in files under `evidence/<id>/`. |
| CLAUDE.md content: commands Claude can't guess, deviations from defaults, repo etiquette, project-specific decisions, gotchas. Not: things derivable from code, tutorials, file-by-file maps. "Would removing this cause Claude to make mistakes? If not, cut it." (CC best-practices, memory) | `AGENTS.md` follows the include/exclude list. `/doctor` style trims are part of harness maintenance. |
| Compaction guidance: preserve modified files, test commands, open questions (CC). | Stated verbatim in `CLAUDE.md`. |
| Reset deliberately: new session per unit; after repeated failed corrections, clear (CC, Cursor, Codex, HumanLayer). | One unit per session. After two failed fix rounds the skill stops and reports; a human decides whether to re-plan. |

## 3. Prompting the model (Claude 5 family)

| Principle (source) | FA Lens rule |
|---|---|
| Be clear and direct; state desired behavior and scope; the "colleague with minimal context" test (PROMPT). | Every agent file opens with a one-sentence role and a plain statement of what to return. Unit files pass the colleague test by construction (Scope, Out of scope, DoD). |
| Explain **why**; positive instructions over prohibitions; avoid shouting ("CRITICAL/MUST") because current models over-trigger on it (PROMPT, skill-creator). | Rules in this repo carry their reason. No all-caps imperatives in prompts. |
| Don't over-prompt verification on Opus 5 / Fable: "verification instructions can cause over-verification"; use fresh verifiers instead (PROMPT Opus 5, Fable 5). | Builder prompt does not say "double-check"; verification is a separate state run by scripts and reviewer agents. |
| Review prompts saying "be conservative" cause under-reporting; ask for everything and filter later (PROMPT Opus 5, Osmani: heterogeneous reviewers). | Reviewer agents are told to report every issue with severity; the builder triages. |
| Autonomy and scope blocks: "You are operating autonomously…" and "the scope is the deliverable" (PROMPT Fable 5.1). "Report follow-ups, don't fix them." | Included in the build skill. Follow-ups become new unit files. |
| Ground progress: "audit each claim against a tool result from this session" (PROMPT Fable 5). | The one rule in `AGENTS.md`. Evidence paths required in the PR template. |
| Prefer general instructions over prescriptive steps for reasoning; do not ask the model to reproduce its reasoning (PROMPT). | Agents get rubrics and output formats, not step scripts, except where a script is safer (then it is a script). |
| Parallel tool calls when independent (PROMPT). | Reviewers are launched in one message. Explorer sub-searches run in parallel. |

## 4. Skills, agents, hooks (Claude Code mechanics)

| Principle (source) | FA Lens rule |
|---|---|
| Skills: `SKILL.md` under 500 lines, references one level deep, description in third person with "Use when…", `disable-model-invocation: true` for side-effect workflows, scripts for deterministic steps ("solve, don't defer") (SKILLS, CC skills). | `/build` is manual-only with bundled scripts; `/unit` and `/harness-eval` likewise. Reference material lives in `docs/orchestration.md`, one hop away. |
| Sub-agents: fresh context, tool allow-list, `model`, `maxTurns`; omit `Agent` to prevent spawning; keep descriptions concise (CC sub-agents). | Every agent in `.claude/agents/` has an allow-list, a model, `maxTurns`, and no `Agent` tool. Reviewers are read-only. |
| Hooks for "anything that must happen every time with zero exceptions"; **exit 2 blocks**; `PreToolUse` deny JSON; `PostToolUse` on `Edit|Write` for lint (CC hooks). | `guard-bash.sh` (terminus rule, destructive commands, source writes) and `post-edit.sh` (syntax, schema, allowed-files) in `.claude/settings.json`; git hooks mirror the gate. |
| Plan mode first for non-trivial work; `permissions.defaultMode: plan` per project (CC). | Project default is plan mode. Tier 2/3 plans need human approval. |
| Worktrees for isolation and parallelism (CC common-workflows, Codex, Cursor). | `tool/wt.sh`; one unit = one worktree = one branch = one PR. |
| `/goal`, Stop hooks, and verification subagents escalate how hard "done" is checked (CC best-practices). | The build skill sets a goal per unit ("DoD items all evidenced") and refuses to end on assertion. |
| Routines, `/loop`, workflows exist for scheduled/parallel work; prompts must be self-contained and say what success looks like (CC). | Harness evals and nightly doc checks can run as routines later; unit files are already self-contained prompts. |

## 5. Verification and evals

| Principle (source) | FA Lens rule |
|---|---|
| Test first: confirm the test **fails** before implementing; keep tests unmodified during implementation; existing tests must keep passing (Willison, Cursor, Spec Kit, SWE-bench FAIL_TO_PASS + PASS_TO_PASS). | DoD always includes "a test that fails without the change". Reviewers flag any weakened or rewritten assertion. |
| A task is well-specified when two experts would agree on pass/fail; ambiguous specs and unfair tests are the main source of false failures (EVALS, SWE-bench Verified: 68% of tasks filtered for underspecification or unfair tests). | Unit DoD items must name a command or a test; `/unit` refuses vague items. Spec Kit-style `[NEEDS CLARIFICATION]` markers are allowed in drafts and block `ready`. |
| Start evals small: 20–50 tasks from real failures; regression evals stay near 100%; isolate trials; harden graders; read transcripts; evals need an owner (EVALS, MAR, TOOLS). | `docs/orchestration/evals.md` holds harness evals (E-units) with owner and last result. New E-units are added from real harness failures. |
| Deterministic sensors first (tests, types, lint, arch rules), LLM judges as supplementary signal, never auto-merge authority (Böckeler, Osmani, Django). | Gate is deterministic; reviewer agents advise; a human merges. |
| Read test changes more suspiciously than code; forbid weakening CI gates (Osmani). | adr-reviewer and adapter-safety-reviewer explicitly check test diffs and gate configs. |

## 6. Human boundary and PR discipline

| Principle (source) | FA Lens rule |
|---|---|
| Humans own the merge; never ship unreviewed agent code; agents write convincing PR descriptions, review those too (Willison, Osmani, Kubernetes, Django, Ghostty). | Terminus rule: no push to main, PR from unit branches, human merges. Fresh-eyes agent summarizes the diff independently for tier 3. |
| Small PRs; one concern; evidence of manual testing (Willison, Osmani, Harper). | One unit per PR; PR template requires evidence paths and screenshots. |
| Disclose AI use; the human remains responsible (Kubernetes, Django). | Commits carry the Claude co-author trailer; PR body states which agents ran and their verdict files. |
| Spec approval gates between requirements → design → tasks (Kiro, Spec Kit). | Stage 5 unit backlog is written from `docs/architecture.md` + ADRs; each unit is approved by a human before `status: ready`. |

## 7. Anti-patterns we explicitly avoid

- One mega-prompt from plan to PR (BEA, CTX): the loop is staged and file-checkpointed.
- Unbounded "repeat until green" loops with no stop condition (Ralph critiques, HumanLayer): stop conditions are explicit and reported.
- Self-graded work (HARN2).
- Bloated CLAUDE.md that makes the model ignore instructions (CC).
- Tool/agent proliferation with overlapping roles (TOOLS, CTX): eight agents, each with one rubric.
- Copying style guides into rules instead of using linters (Cursor): style is Stylelint/ESLint, not prose.
- Auto-merge on AI approval; weakened gates (Osmani).
- Skills and prompts that stay prescriptive after models improve (PROMPT Fable 5, HARN2): harness evals re-run on model or tool changes, and prescriptive lines get removed when evals still pass without them.
