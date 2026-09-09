# Knowledge

Repo-level lessons that a newcomer (human or agent) would otherwise re-learn the hard way: business rules verified against real data, tool quirks, wrong assumptions that cost time. Pack-local gotchas live inside the pack (`packs/<name>/knowledge/`); this folder holds what spans the repository.

Conventions (kept by the `memory-scribe` agent after every unit):
- One lesson per file, `docs/knowledge/<area>/<slug>.md`.
- Each file ends with a `Source:` line naming where the fact came from (unit id, spec, ticket, investigation date).
- Plain words, sentence case, no codes. State the rule, then why it matters.
- Delete a file when it turns out to be wrong; do not leave corrections as appendices.

## Index

- [van-sales/cycle-rules.md](van-sales/cycle-rules.md) — the six locked Van Sales cycle and mapping rules from the artifact tools.
- [harness/build-skill-isolate-before-plan.md](harness/build-skill-isolate-before-plan.md) — why `/build` isolates into a worktree before writing the plan, and why `.falens-unit` is gitignored.
- [harness/tool-tests-zero-dependency.md](harness/tool-tests-zero-dependency.md) — zero-dependency tests under `tool/test/` use `node:assert` and spawn the script under test; temp fixtures under `evidence/` must be cleaned up in `finally`.
- [One primary button per screen](design/one-primary-per-screen.md) — an EmptyState's action button must not compete with the page header's single primary button; use the accent variant when the header already owns the primary for that scope.
