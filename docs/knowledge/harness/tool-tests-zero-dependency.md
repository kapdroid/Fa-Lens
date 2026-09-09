# Zero-dependency tests under `tool/test/` use `node:assert` and spawn the script

Rule: a test for a `tool/*.mjs` script does not import the script's internals — it uses `node:child_process`'s `spawnSync` to run the script as a subprocess (`node tool/check-units.mjs`) and asserts on `status`, `stdout`, and `stderr`. It resolves the repo root from its own `import.meta.url` (`resolve(new URL('../..', import.meta.url).pathname)`), not from `process.cwd()`, so the test passes whether it is invoked as `node tool/test/check-units.test.mjs` from the repo root or from any other working directory.
Why: `AGENTS.md`'s "no test framework installation" and `tool/gate.sh` staying dependency-free rule out Vitest/Jest for harness scripts; `node:assert` plus `spawnSync` gets black-box coverage (exit code and stderr content) without adding a package. Deriving root from `import.meta.url` instead of `cwd` avoids a class of "works on my machine, fails in CI" bugs where the runner's cwd differs from the repo root.

# Temp evidence fixtures must be removed in `finally`

Rule: a test that creates a throwaway directory under `evidence/` (e.g. `evidence/X-999/` to simulate an orphan) must delete it inside a `try/finally`, not just at the end of the happy path.
Why: `check-units.mjs` now fails the gate on any `evidence/<name>/` directory that does not match a known unit id (added in this same unit, E-002). A test fixture left behind by an assertion failure or an uncaught exception becomes exactly the orphan the checker is designed to catch — the next `tool/gate.sh` run fails on the test's own leftovers rather than a real problem. `finally` guarantees cleanup regardless of how the test body exits.

Source: E-002, 2026-09-09.
