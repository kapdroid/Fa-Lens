# ADR-0010 — Pack format and registry; packs are data

Status: accepted · Date: 2026-09-09

## Context

The architecture test is: "a new module needs zero kernel changes." Van Sales is the first module; Journey Plan, Outlets, Orders, Attendance, Schemes, Distributors, Reports, and FA↔DMS sync follow. Contributors must be able to add a module by writing files, not code.

## Decision

A **pack** is a directory (or tarball) with a fixed layout, validated against `pack.schema.json` from the kernel:

```
packs/van-sales/
  pack.yaml            # id, name, category (Field app|Dashboard|Data & sync|…), version, kind (module|sync), tabs enabled
  flows/*.yaml         # ADR-0003
  rules/*.yaml         # declarative rules: uniqueness | presence | field_match | aggregate_match | chain | custom-check refs
  cases/*.yaml         # per-endpoint test cases (happy | negative | security | boundary | manual)
  fixtures/*.json      # bodies, seeds
  drilldown.yaml       # hierarchy (company → employee → cycle → product) and the columns per level
  presets.yaml         # validator inputs, default filters, default columns
  knowledge/*.md       # gotchas, business rules; synced to/from the ADO knowledge base
  catalog.refs.yaml    # which catalog sources and endpoints this pack uses (verified nightly)
```

**No executable code in a pack (v1).** Anything a pack cannot express declaratively is a kernel or adapter feature request. Packs are **versioned and content-hashed**; publishing a version is immutable and signed by the publisher; runs record the pack version they used. The **registry** (Postgres) holds installed packs and their published versions; the drawer, the matrix, and module tabs are rendered from the registry, never from code. Pack `kind: sync` enables the sync-specific tab bodies (flow map, hop stepper, failure grid) and disables APIs/Cases/Load.

## Alternatives considered

- **Plugins with code (npm packages).** More power; rejected for v1 because review, sandboxing, and supply-chain risk are disproportionate to the need. Reconsider only if declarative rules provably cannot express a required check.
- **Everything in one giant config.** Rejected: packs need independent ownership and versioning.

## Consequences

- Van Sales pack ports the two artifact tools (cycle reconciliation, mapping validator) as rules + flows + drilldown; their SQL becomes `query` steps and `custom-check` rule definitions interpreted by the kernel.
- The registry is the only place the UI learns about modules; a pack with no runs still shows up with `no runs`.
- Publishing goes through the publish gate (ADR-0011).

## How we verify

CI validates every pack against the schema and runs its flows in dry-run mode against fixtures. The architecture test: adding `packs/journey-plan/` with only YAML makes the module appear in the drawer and matrix with no diff outside `packs/` (asserted by a CI job that fails if the PR touches `packages/` while adding a pack).
