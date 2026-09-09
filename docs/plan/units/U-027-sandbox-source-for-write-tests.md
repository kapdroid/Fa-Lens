---
id: U-027
title: A sandbox http source that may be asked for a write, so the van-sales flow can run
status: draft
tier: 3
kind: pack
depends_on: [U-012]
allowed_files:
  - packs/_sources/catalog.yaml
  - packs/_sources/README.md
  - tool/check-catalog.mjs
adrs: [ADR-0013, ADR-0005]
design: []
dod:
  - "`packs/_sources/catalog.yaml` carries a sandbox http source whose `methods` include POST and whose entry names the sandbox company and the non-production environment it is limited to"
  - "`node tool/check-catalog.mjs --selftest` rejects a POST in `methods` on any source that is not marked as the sandbox, and accepts it on the sandbox source"
  - "`node tool/check-catalog.mjs` exits 0 and `bash tool/gate.sh --fast` is green"
evidence: [gate.log, catalog.log]
estimate: M
owner:
---

# U-027 · A sandbox http source that may be asked for a write, so the van-sales flow can run

## Scope
The http adapter treats a source's `methods` list as its read-only guard, and the catalog lists only GET and HEAD for `app_api` and `dashboard_api`. The van-sales day-cycle flow posts to `check/login` and `day/begin`, so it cannot run until a source exists that is allowed to be posted to. Architecture §8 says write-tests run only against sandbox companies on non-production environments, so this unit adds exactly that source and makes the validator refuse a writing method anywhere else.

## Out of scope
No adapter change. No credential. No flow or pack content.

## Plan
(written by /build)

## Verification
- `node tool/check-catalog.mjs --selftest` and `node tool/check-catalog.mjs` → `evidence/U-027/catalog.log`
- `bash tool/gate.sh --fast` → `evidence/U-027/gate.log`
- A human confirms which company and environment the sandbox is, before this unit becomes ready.

## Progress
2026-09-09 · draft · created from U-012's explore finding: the read-only guard will refuse the van-sales POST steps until a sandbox source exists. Needs the owner to name the sandbox company and environment.
