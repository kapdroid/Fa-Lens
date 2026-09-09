---
id: U-004
title: Confirm replica hostnames for every catalog source
status: draft
tier: 3
kind: pack
depends_on: []
allowed_files:
  - packs/_sources/catalog.yaml
  - packs/_sources/README.md
adrs: [ADR-0013]
design: []
dod:
  - "every source in packs/_sources/catalog.yaml has confirm: false"
  - "node tool/check-catalog.mjs prints 0 placeholder warnings"
  - "packs/_sources/README.md records the owner's confirmation (who confirmed, which servers, when) for every source"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, catalog-check.log]
estimate: M
owner: harness
---

# U-004 · Confirm replica hostnames for every catalog source

## Scope
Every source in the v1 catalog (`packs/_sources/catalog.yaml`, ADR-0013) currently carries `confirm: true` because the server names came from artifact-tool inspection, not from a verified replica list (see `docs/knowledge/sources/catalog-server-names-unconfirmed.md`). This unit gets the real per-tenant hostnames for Report and DMS confirmed as read replicas (FA transaction and FA master names are already believed correct from the artifact tools but still need the same sign-off), flips `confirm` to `false` once each is verified, and records who confirmed what, and when, in `packs/_sources/README.md`.

## Out of scope
No adapter code, no actual database connections from this repo — verification is against infra/ops records or a DBA, not a live query. No change to the catalog's shape, tenant list, or the six-tenant requirement. The gate globbing `packs/_sources/catalog*.yaml` for a beta overlay is out of scope here too: no beta overlay exists yet, so there is nothing to glob; that follow-up should become its own unit once a beta overlay is actually added.

## Plan
(written by /build in state 2)

## Verification
- `node tool/check-catalog.mjs` → `evidence/U-004/catalog-check.log`, showing `0 placeholder warnings`
- `bash tool/gate.sh --fast` → `evidence/U-004/gate.log`
- Manual: `packs/_sources/README.md` lists, per source, the confirming owner and date.

## Progress
2026-09-09 10:18 · draft · created by memory-scribe from E-004's follow-up: "confirm real Report and DMS per-tenant replica hostnames before any adapter unit connects (catalog entries carry `confirm: true`)" and round-2 review note "adapter unit must require confirm: false for every source it connects to" (that requirement belongs to the adapter unit's own DoD, not here; this unit only gets the catalog itself to confirm: false).
