# An assertion keyword that modifies another (`delta` on `equals`) must win the kind lookup, not lose to declaration order

Rule: when one assertion key changes the meaning of another — ADR-0003's `delta` narrows `equals` from exact match to `|actual - equals| <= delta` — the kind-lookup logic must check for the modifying key first. Picking the first matching key by declaration order in the assertion object (as written by the schema, `equals` before `delta`) silently reads a `{ equals, delta }` pair as plain `equals` and drops the tolerance, because `equals` matches the lookup before `delta` is ever consulted.

This bug shipped invisibly: nothing failed, because no test exercised `delta` — the assertion just always demanded an exact match. It only surfaced once a test was written for the keyword itself (U-008, prompted by a reviewer `should`). Any assertion vocabulary with modifier keys needs an explicit test per keyword, including combinations, not just the base keys — untested keywords are exactly where declaration-order bugs like this hide.

Source: U-008, 2026-09-09 (ADR-0003 assertion vocabulary; found via `review-adr-reviewer.json` round 1).
