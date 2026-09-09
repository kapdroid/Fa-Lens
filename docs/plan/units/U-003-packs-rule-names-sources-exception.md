---
id: U-003
title: packs.md rule names the _sources exception
status: in_progress
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
1. Red check first: `grep -n 'packs/_sources' .claude/rules/packs.md` exits 1 (the rule does not name the exception) → `evidence/U-003/red.log`.
2. Edit only line 9 of `.claude/rules/packs.md` (body, frontmatter untouched): after "no server names in a pack." add one sentence naming the exception: `packs/_sources/**` (the source catalog, ADR-0013) holds the tenant → server maps precisely so no module pack ever needs one — server names yes, credentials never (only `vault://` references; no connection strings, no primary hosts). Wording echoes `packs/_sources/README.md` so the two stay consistent. No links added (check-docs does not scan `.claude/rules`).
3. Green check: the same grep prints the line naming `packs/_sources/**` and ADR-0013 in one sentence → `evidence/U-003/green.log`; `node tool/check-docs.mjs` → `evidence/U-003/check-docs.log`; `bash tool/gate.sh --fast` → `evidence/U-003/gate.log`. Commit `U-003: packs.md names the _sources exception`.

## Verification
- `node tool/check-docs.mjs` → `evidence/U-003/check-docs.log`
- `bash tool/gate.sh --fast` → `evidence/U-003/gate.log`
- Manual: `packs.md` names `packs/_sources/**` and ADR-0013 in the same sentence as the exception.

## Progress
2026-09-09 10:18 · draft · created by memory-scribe from E-004's follow-up: "`.claude/rules/packs.md` should name the `packs/_sources/**` exception explicitly (outside allowed_files here)."
2026-09-09 11:28 · intake · brief ok (status ready set in PR #8 on the owner's instruction; intake run from that branch's worktree)
2026-09-09 11:28 · explore · findings recorded; 0 open questions. Target sentence packs.md:9; wording to echo packs/_sources/README.md:5-7 and ADR-0013 line 11; check-harness requires the paths: frontmatter untouched; check-docs does not scan .claude/rules so no links are added
2026-09-09 11:28 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-003-packs-sources-exception
2026-09-09 11:30 · build · gate --fast green at 41c6aae; red.log grep exit 1 before, green.log names packs/_sources/** and ADR-0013 in one sentence
