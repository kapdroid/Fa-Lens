# A tool's own `selftest` subcommand gives red-then-green evidence when `tool/test/**` is outside the unit's allowed_files

Tests-first normally means a script under `tool/test/` that spawns the tool under test. When a unit's frontmatter `allowed_files` does not list `tool/test/**` (only the tool file itself, e.g. `tool/evals.mjs`), that path is not available — writing to it would be scope creep the reviewer would reject.

The fix is a `selftest` subcommand built into the tool itself: `node tool/evals.mjs selftest` runs its assertions in a temp dir (`node:os.tmpdir()`), using only the zero-dependency modules already in scope (`node:assert/strict`, `node:fs`, `node:os`, `node:path`). Before the implementation exists the assertions throw (`red.log`); after, they pass (`selftest.log`). This is the same precedent as `tool/check-catalog.mjs --selftest` (see `docs/knowledge/harness/config-validator-allow-list-first.md`) and reads as the tests-first cycle without ever touching a directory outside `allowed_files`.

Check the unit's `allowed_files` list before assuming `tool/test/**` is available — if it is not there, plan for an in-tool `selftest` from the start rather than discovering the constraint mid-build.

Source: E-005, 2026-09-09
