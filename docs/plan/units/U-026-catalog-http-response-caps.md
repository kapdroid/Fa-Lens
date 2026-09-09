---
id: U-026
title: Give http sources a response cap in the catalog instead of in adapter code
status: draft
tier: 2
kind: pack
depends_on: [U-012]
allowed_files:
  - packs/_sources/catalog.yaml
  - packs/_sources/README.md
  - tool/check-catalog.mjs
  - packages/adapters/src/adapter.ts
adrs: [ADR-0013, ADR-0014, ADR-0005]
design: []
dod:
  - "`node tool/check-catalog.mjs --selftest` accepts `maxBytes` and `rows` under an http source's limits and rejects a non-positive value for either"
  - "`packs/_sources/catalog.yaml` gives app_api and dashboard_api an explicit maxBytes and rows, and `node tool/check-catalog.mjs` exits 0"
  - "`packages/adapters/src/adapter.ts`'s DEFAULT_MAX_BYTES and DEFAULT_MAX_ROWS become the fallback for a source that omits them, and `pnpm -s vitest run packages/adapters/test` stays green"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, catalog.log]
estimate: S
owner:
---

# U-026 · Give http sources a response cap in the catalog instead of in adapter code

## Scope
U-012 had to put the http response caps (5 MB, 50,000 rows) in adapter code because the catalog carries only `timeoutMs`, `concurrency` and `interactiveMaxDays` for an http source, while SQL sources already carry a `rows` limit. A budget is data about a source, not a property of the client, so the catalog should hold both numbers and the adapter should fall back to its defaults only when a source omits them.

## Out of scope
No change to how the adapter enforces the caps, only to where the numbers come from. No new source.

## Plan
(written by /build)

## Verification
- `node tool/check-catalog.mjs --selftest` and `node tool/check-catalog.mjs` → `evidence/U-026/catalog.log`
- `bash tool/gate.sh --fast` → `evidence/U-026/gate.log`

## Progress
2026-09-09 · draft · created from U-012's explore finding: the catalog cannot express an http response cap today.
