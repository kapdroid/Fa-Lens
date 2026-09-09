# Knowledge

Repo-level lessons that a newcomer (human or agent) would otherwise re-learn the hard way: business rules verified against real data, tool quirks, wrong assumptions that cost time. Pack-local gotchas live inside the pack (`packs/<name>/knowledge/`); this folder holds what spans the repository.

Conventions (kept by the `memory-scribe` agent after every unit):
- The index below is generated: `node tool/knowledge-index.mjs` lists every note by area with its first heading as the description; the gate's `knowledge-index` stage fails when the committed index is stale. Do not edit it by hand; make the note's heading say what a reader needs.
- One lesson per file, `docs/knowledge/<area>/<slug>.md`.
- Each file ends with a `Source:` line naming where the fact came from (unit id, spec, ticket, investigation date).
- Plain words, sentence case, no codes. State the rule, then why it matters.
- Delete a file when it turns out to be wrong; do not leave corrections as appendices.

## Index

<!-- index:start -->
### design

- [Prototype demo affordances belong in Scenarios, not the module header](design/demo-affordances-in-scenarios-not-header.md)
- [One primary button per screen](design/one-primary-per-screen.md)

### harness

- [The build skill isolates into a worktree before writing the plan](harness/build-skill-isolate-before-plan.md)
- [Any unit that adds a dependency must list `pnpm-lock.yaml` in `allowed_files` until the harness always allows it](harness/check-allowed-should-always-allow-pnpm-lock-yaml.md)
- [Hand-rolled config validators must be allow-list first and self-tested in the gate](harness/config-validator-allow-list-first.md)
- [Evidencing a DoD command that mutates a committed ledger: run it literally, capture the diff, then revert](harness/evidence-for-ledger-mutating-dod.md)
- [The generated knowledge index only carries a note's first heading](harness/generated-knowledge-index-only-keeps-a-notes-first-heading.md)
- [Capturing light and dark screenshots with headless Chrome](harness/headless-chrome-light-and-dark-screenshots.md)
- [Intake must accept a `depends_on` unit that is merged but still says `status: review`](harness/intake-accepts-merged-review-dependency.md)
- [A unit's Plan must describe example links in words, not write a placeholder markdown link](harness/plan-example-links-must-be-real-or-worded-not-placeholder-markdown-links.md)
- [`tool/pr.sh`'s body renderer needs `summary.json` `evidence` fields to be plain strings](harness/pr-sh-summary-evidence-must-be-a-string.md)
- [A red check must fail for the reason the unit fixes](harness/red-check-must-fail-for-the-right-reason.md)
- [Tests-first cannot be committed as a separate red commit; `red.log` is the red evidence instead](harness/tests-and-implementation-land-in-one-commit-red-log-is-the-evidence.md)
- [A tool's own `selftest` subcommand gives red-then-green evidence when `tool/test/**` is outside the unit's allowed_files](harness/tool-selftest-when-tests-dir-not-allowed.md)
- [Zero-dependency tests under `tool/test/` use `node:assert` and spawn the script](harness/tool-tests-zero-dependency.md)

### kernel

- [An assertion keyword that modifies another (`delta` on `equals`) must win the kind lookup, not lose to declaration order](kernel/assertion-keyword-that-modifies-another-must-win-kind-lookup.md)
- [The six fingerprint cause words, and why duplicate is judged before agreement](kernel/fingerprint-cause-words-defined-and-duplicate-before-agreement.md)
- [Generated SQL is safe by construction, not by inspection](kernel/generated-sql-is-safe-by-construction-not-by-inspection.md)
- [The kernel stays pure by taking the executor as a callback and asserting latency from its reported duration, never a clock](kernel/kernel-purity-executor-callback-and-reported-duration.md)
- [A sentinel value routed through a formatter is a bug waiting to happen](kernel/sentinel-value-through-a-formatter-is-a-bug-waiting-to-happen.md)
- [Verdict severity order is `none < skipped < ok < warn < error < fail`, and counts tally direct children only](kernel/verdict-severity-order-and-count-tally.md)

### sources

- [Catalog server names come from artifact tools, not from a confirmed replica list](sources/catalog-server-names-unconfirmed.md)

### toolchain

- [`ajv` and `ajv-formats` are CommonJS; import them accordingly under NodeNext](toolchain/ajv-and-ajv-formats-are-commonjs-under-nodenext.md)
- [ESLint config must ignore `.claude/**` and `tool/**`](toolchain/eslint-must-ignore-claude-and-tool-dirs.md)
- [pnpm 11 reads its build/dep settings from `pnpm-workspace.yaml`, not `package.json`'s `pnpm` field](toolchain/pnpm-11-reads-pnpm-workspace-yaml-not-package-json.md)

### van-sales

- [Van Sales: the six locked cycle and mapping rules](van-sales/cycle-rules.md)
<!-- index:end -->
