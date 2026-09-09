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
- [harness/tool-selftest-when-tests-dir-not-allowed.md](harness/tool-selftest-when-tests-dir-not-allowed.md) — a tool's own `selftest` subcommand gives red-then-green tests-first evidence when `tool/test/**` is outside the unit's `allowed_files`.
- [harness/evidence-for-ledger-mutating-dod.md](harness/evidence-for-ledger-mutating-dod.md) — evidencing a DoD command that mutates a committed ledger: run it literally, capture the diff, then revert, and say so in the evidence log.
- [harness/intake-accepts-merged-review-dependency.md](harness/intake-accepts-merged-review-dependency.md) — intake must accept a `depends_on` unit that is merged into `origin/main` but still reads `status: review`; a second `.falens-unit` tracking regression fixed alongside it.
