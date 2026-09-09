# A sentinel value routed through a formatter is a bug waiting to happen

A keyless presence rule used `'*'` as a stand-in for "no keys," and that sentinel was passed through the same identifier quoter used for real column names. The strip that removes everything outside letters, digits, and underscore ate the `*` entirely, so `'*'` compiled to an empty identifier — `SELECT [], COUNT(*) ... GROUP BY []` — which still started with `SELECT`, still had no semicolon, and so still passed `guardOk`: a shape check cannot tell a broken identifier from an empty one on purpose.

No fixture exercised a keyless presence rule, so no test caught it. It surfaced only because a reviewer read the compiler's code path rather than trusting the test suite's green result. The fix: a keyless presence rule now compiles a plain `COUNT(*)` instead of routing `'*'` through the identifier formatter at all. General lesson: a sentinel value must take its own code path, never share a formatter meant for real data — and a shape-only guard (SELECT-or-WITH, no-semicolon) does not substitute for reading the code around an edge case with no fixture.

Source: U-009, 2026-09-09 (`review-adr-reviewer.json` round 1, should-fix; `packages/kernel/src/rules/compile.ts`).
