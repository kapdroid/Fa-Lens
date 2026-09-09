# Tests-first cannot be committed as a separate red commit; `red.log` is the red evidence instead

The gate's typecheck stage (`pnpm -s typecheck`) type-checks test files along with source, project-wide. If a unit commits its failing tests before the implementation exists, the commit itself fails typecheck (missing exports, missing types) and cannot pass the gate on its own — even though the tests are correctly red for the right reason (the DoD's "tests first" step).

The working pattern (see U-007): run the tests before writing any implementation and capture that failing run as `evidence/U-xxx/red.log` (e.g. "parsePack is not a function"). Then write the implementation in the same commit as the tests, so the committed state always type-checks and gates green. `red.log` is what proves the test would have failed without the change; it stands in for a red commit rather than the branch actually holding one.

Source: U-007, 2026-09-09
