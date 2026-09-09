## What this diff does (fresh-eyes, native agent)
Adds packs/_sources/catalog.yaml (7 sources, env prod, six tenants, replicas, vault refs, budgets, unify coming-soon, http sources GET/HEAD), tool/check-catalog.mjs (YAML-subset parser + allow-list-first validator + --selftest), packs/_sources/README.md, and two gate stages (catalog, catalog-selftest).

## Scope match
- matches: partly → after triage: yes. The HTTP sources and env field are required by the unit's DoD item 1 and by the round-1 safety review respectively, so they are in scope; "the file is flat" in Scope was an expectation, the parser handles nesting.
- surprises addressed: README/validator disagreement about enabling Unify fixed; duplicate Progress line removed; stale evidence from e4dc61c regenerated at HEAD; NBSP in regex replaced with \u00A0.

## Surprises left as follow-ups
- suspicious-key regex is broad; future legitimate keys must be added to KNOWN (documented in README's validation section by the allow-list rule).
