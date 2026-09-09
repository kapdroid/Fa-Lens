# Prototype demo affordances belong in Scenarios, not the module header

`docs/design/screens.md` limits the module page header to crumbs, title, and one primary button — that budget is for the real product, but it is easy to forget it also binds anything the prototype adds to demo a state. A "Show empty state" toggle placed next to the header's primary looked harmless but broke the header's contract the same way a second primary button would.

The fix: prototype-only ways to reach a state (empty, failed, loading, …) go in the Scenarios menu as a walkthrough step, plus a deep link (`#/module/<id>/<tab>/empty`) for direct access. The header stays exactly what the design spec says it is, in every mode the prototype can be in — not just the default one.

When adding a new demo trigger to the prototype, ask: is this widening what a spec'd region (header, card, nav) is allowed to contain? If yes, it belongs in Scenarios instead.

Source: U-002, 2026-09-09 (design reviewer, round 1)
