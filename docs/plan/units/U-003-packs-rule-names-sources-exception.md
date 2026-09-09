---
id: U-003
title: packs.md rule names the _sources exception
status: draft
tier: 1
kind: docs
depends_on: []
allowed_files:
  - .claude/rules/packs.md
adrs: [ADR-0010, ADR-0013]
design: []
dod:
  - "`.claude/rules/packs.md` states the `packs/_sources/**` exception to 'no server names in a pack' explicitly, citing ADR-0013 (server names yes, credentials never)"
  - "node tool/check-docs.mjs passes"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, check-docs.log]
estimate: S
owner: harness
---

# U-003 · packs.md rule names the `_sources` exception

## Scope
`.claude/rules/packs.md` currently says "no scripts, no code, no credentials, no server names in a pack" without carving out the one exception the repo already ships: `packs/_sources/catalog.yaml` (ADR-0013) legitimately contains server names (never credentials — those stay `vault://` references). E-004 built and shipped that catalog under this exception but could not update the rule file itself (outside its `allowed_files`). This unit adds one or two sentences to `packs.md` naming the exception, its scope (`packs/_sources/**` only), and the ADR that authorizes it, so a future builder reading the rule does not have to rediscover the exception by reading the catalog.

## Out of scope
No changes to the catalog itself, no new rules, no restructuring of `packs.md` beyond the exception sentence.

## Plan
(written by /build in state 2)

## Verification
- `node tool/check-docs.mjs` → `evidence/U-003/check-docs.log`
- `bash tool/gate.sh --fast` → `evidence/U-003/gate.log`
- Manual: `packs.md` names `packs/_sources/**` and ADR-0013 in the same sentence as the exception.

## Progress
2026-09-09 10:18 · draft · created by memory-scribe from E-004's follow-up: "`.claude/rules/packs.md` should name the `packs/_sources/**` exception explicitly (outside allowed_files here)."
