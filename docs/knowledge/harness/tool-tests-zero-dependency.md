# Zero-dependency tests under `tool/test/` use `node:assert` and spawn the script

Rule: a test for a `tool/*.mjs` script does not import the script's internals — it uses `node:child_process`'s `spawnSync` to run the script as a subprocess (`node tool/check-units.mjs`) and asserts on `status`, `stdout`, and `stderr`. It resolves the repo root from its own `import.meta.url` (`resolve(new URL('../..', import.meta.url).pathname)`), not from `process.cwd()`, so the test passes whether it is invoked as `node tool/test/check-units.test.mjs` from the repo root or from any other working directory.
Why: `AGENTS.md`'s "no test framework installation" and `tool/gate.sh` staying dependency-free rule out Vitest/Jest for harness scripts; `node:assert` plus `spawnSync` gets black-box coverage (exit code and stderr content) without adding a package. Deriving root from `import.meta.url` instead of `cwd` avoids a class of "works on my machine, fails in CI" bugs where the runner's cwd differs from the repo root.

# Temp evidence fixtures must be removed in `finally`

Rule: a test that creates a throwaway directory under `evidence/` (e.g. `evidence/X-999/` to simulate an orphan) must delete it inside a `try/finally`, not just at the end of the happy path.
Why: `check-units.mjs` now fails the gate on any `evidence/<name>/` directory that does not match a known unit id (added in this same unit, E-002). A test fixture left behind by an assertion failure or an uncaught exception becomes exactly the orphan the checker is designed to catch — the next `tool/gate.sh` run fails on the test's own leftovers rather than a real problem. `finally` guarantees cleanup regardless of how the test body exits.

# A gate stage that iterates a glob must guard the empty case, and loudly

Rule: before adding a `for f in <dir>/*.ext; do ...; done` stage to `tool/gate.sh`, wrap it in `if compgen -G "<dir>/*.ext" >/dev/null; then run "<stage>" ...; else skip "<stage>" "no <dir>/*.ext yet"; fi`, copying the existing `shell-scripts` stage's `bash -c` loop pattern and the loud-skip wording already used elsewhere in the file (e.g. `no package.json yet`).
Why: an unguarded glob that matches nothing expands to the literal pattern string in bash by default, so the loop body runs once against a nonexistent file and either errors confusingly or (worse) silently no-ops depending on the command — either way the gate reports something other than what happened. `AGENTS.md` requires every stage to be "skipped with a note when its inputs do not exist yet, and NEVER silently"; `compgen -G` is the cheapest correct guard and keeps the skip message visible in the gate log instead of buried in a stack trace.

# Prove the gap before closing it

Rule: when a unit's job is "the gate should already be catching X but isn't," capture evidence of the gate running green while X is true *before* making the change (e.g. `evidence/<unit>/before.log`: a deliberately failing test present, `tool/gate.sh --fast` still exits 0), then make the change and show the same scenario now red, then green again after the fix.
Why: without the "before" log, a reviewer (or a future reader of the unit) cannot tell whether the DoD's red/green transition proves the new stage works or merely proves a test can fail and be removed — the missing-coverage gap itself is the thing being fixed, and it is only demonstrable by first showing it exists.

Source: E-002, 2026-09-09. Gate-glob and prove-the-gap lessons added from U-001, 2026-09-09.
