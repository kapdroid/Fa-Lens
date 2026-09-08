# FA Lens — working agreement for every agent and human

Read this first. It is short on purpose; details live in the linked docs and load when you touch that area.

## What this repo is
FA Lens: module-centric testing and validation platform for FieldAssist (API tests, flows, data validations, cross-source sync) with UI, CLI, and MCP parity. Map: `docs/architecture.md`. Decisions: `docs/adr/`. Look and feel: `docs/design/`. Work queue: `docs/plan/units/`. How we build: `docs/orchestration.md`.

## The one rule
Evidence over assertion. "Tests green at `<sha>`, log at `evidence/U-012/gate.log`" is a claim; "I implemented it" is not. Before reporting progress, check each claim against a tool result from this session.

## How work happens
- Work is done in **units** (`docs/plan/units/U-xxx.md`): one unit = one worktree = one branch `unit/U-xxx` = one PR. Never edit in the main checkout; `tool/wt.sh add U-xxx <slug>` creates the worktree.
- The unit's frontmatter is the contract: `allowed_files` is the only place you may change; `dod` is the only definition of done; `adrs` name what the reviewer checks. If the work needs something outside that, stop and report; do not widen scope.
- Start a unit with `/build U-xxx`. It runs the state machine (intake → explore → isolate → plan → build → verify → review → PR → memory) and stops at the defined checkpoints. Tier 2 and 3 units need plan approval from a human before code.
- Tests first: write the failing test, then the code. A test that would not fail without the change proves nothing.
- `tool/gate.sh` is the gate, identical locally, in hooks, and in CI. Green gate at the PR head SHA is required, never sufficient: the unit's own DoD items also need evidence in `evidence/U-xxx/`.
- A human merges. Nothing pushes `main` (pre-push hook enforces). PRs come from `unit/`, `chore/`, or `docs/` branches.

## Boundaries that hooks and gates enforce
- Kernel imports nothing; api never imports adapters; packs contain no code (`tool/check-boundaries` once packages exist; `tool/check-units` now).
- Sources are read-only; adapters block non-SELECT statements; production credentials exist only as `vault://` references (ADR-0005, ADR-0013).
- No raw hex/px in UI code; tokens only (ADR-0007).
- AI generates suggestions and explanations only; runs are deterministic (ADR-0012).

## Conventions
- Commits: `U-012: <what changed>`; small, buildable, one concern.
- Names: sentence case in UI copy; ids and numbers monospace; plain cause words (`sync gap`, `unexplained`) not codes.
- Docs are code: a moved decision needs an ADR (new file, never edit history); a moved visual needs `docs/design/` updated in the same PR.
- Follow-ups you notice go into a new unit file, not into this PR.

## When unsure
Read the implementation, not just its signature. Run the smallest experiment that answers the question. If the answer needs a human (product decision, credentials, ambiguous scope), write the question into the unit's `## Progress` and stop.
