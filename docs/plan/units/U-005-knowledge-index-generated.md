---
id: U-005
title: Generate the docs/knowledge index instead of hand-editing it
status: in_progress
tier: 1
kind: harness
depends_on: []
allowed_files:
  - tool/knowledge-index.mjs
  - tool/gate.sh
  - docs/knowledge/README.md
  - .claude/agents/memory-scribe.md
adrs: [ADR-0011]
design: []
dod:
  - "node tool/knowledge-index.mjs writes the index section of docs/knowledge/README.md between two marker comments from the files on disk; running it twice produces no diff"
  - "bash tool/gate.sh --fast fails when the committed index differs from the generated one (stage knowledge-index)"
  - ".claude/agents/memory-scribe.md tells the agent to run the generator instead of editing the index by hand"
  - "bash tool/gate.sh --fast is green"
evidence: [gate.log, idempotent.diff]
estimate: S
owner:
---

# U-005 · Generate the docs/knowledge index instead of hand-editing it

## Scope
Every unit that adds a knowledge note edits `docs/knowledge/README.md`, so parallel units conflict on the same lines (seen when merging PR #1 then #2, #3, #4). Make the index generated: a zero-dependency script lists `docs/knowledge/<area>/*.md`, takes each file's first heading as the description, and rewrites the section between `<!-- index:start -->` and `<!-- index:end -->`. The gate checks the committed file equals the generated one. The memory-scribe agent runs the script.

## Out of scope
No changes to note format beyond requiring a first-line `# ` heading; no changes to pack-local knowledge folders.

## Plan
1. Test first (red): create `tool/knowledge-index.mjs` with the CLI dispatch (`node tool/knowledge-index.mjs [--check]`, `node tool/knowledge-index.mjs selftest`), an exported `generate(dir, {check})` that throws `not implemented`, and a working `selftest` (zero deps, temp dir): it writes `README.md` with prose above, `## Index`, `<!-- index:start -->` … `<!-- index:end -->`, prose below, plus notes in two areas; asserts the generated section lists every note as a list item whose link text is the first heading and whose target is the note's area-relative path, under a `### area` heading per area (areas and files sorted), prose outside the markers byte-identical, second run reports `changed: false`, `--check` reports a stale index without writing, a note without a first-line `# ` heading fails naming the file, missing markers fail. `node tool/knowledge-index.mjs selftest` → red → `evidence/U-005/red.log`.
2. Implement `generate`: copy `tool/evals.mjs` `render` shape (markers, replace only between them, single trailing newline, `--check` exits 1 without writing). Selftest green → `evidence/U-005/selftest.log`.
3. `docs/knowledge/README.md`: wrap the `## Index` list in the two markers, run the generator once (adds the two un-indexed notes, replaces hand-written hooks with first headings), run it again → `git diff --stat docs/knowledge/README.md` empty → `evidence/U-005/idempotent.diff`.
4. `tool/gate.sh`: stage `knowledge-index` (`node tool/knowledge-index.mjs --check`) right after `docs`, and `knowledge-index-selftest` next to it. Break the committed index by hand (delete one row) → `bash tool/gate.sh --fast` RED naming the stage → `evidence/U-005/gate-red.log`; regenerate → GREEN → `evidence/U-005/gate.log`.
5. `.claude/agents/memory-scribe.md` step 1: after writing lesson files, run `node tool/knowledge-index.mjs` to regenerate the index instead of editing it by hand (the gate fails on a stale index). No shouting words; `check-harness` stays green (in gate.log).

## Verification
- generate twice, `git diff --stat docs/knowledge/README.md` empty after the second run → `evidence/U-005/idempotent.diff`
- temporarily break the index by hand, gate red; regenerate, gate green → `evidence/U-005/gate.log`

## Progress
2026-09-09 11:56 · intake · brief ok (status ready set in PR #12 on the owner's instruction; intake run from that branch's worktree)
2026-09-09 11:56 · explore · findings recorded; 1 question marked blocking (flat vs per-area index) is a format choice inside the unit's own wording ('lists docs/knowledge/<area>/*.md') → decided: grouped by area with a ### heading per area, files sorted; description = first heading as the scope says. Pre-existing drift: config-validator-allow-list-first.md and sources/catalog-server-names-unconfirmed.md are on disk but not in the index (proves the point). Known loss: hand-written hooks after the dash go away; follow-up if a hook mattered, move it into the note's heading. No markers exist yet → this unit adds them around ## Index
2026-09-09 11:56 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-005-knowledge-index-generated
2026-09-09 11:57 · build · gate --fast green at 9b01b48; red.log 6 failing before, selftest.log 6 ok after; idempotent.diff empty; gate-red.log shows knowledge-index FAIL with a hand-broken index; two previously un-indexed notes now listed. follow-up: hand-written index hooks were replaced by first headings; if a hook mattered, a docs unit moves it into that note's heading
2026-09-09 11:57 · build · gate --fast green at 9ba2a78; red.log 5 failing before, selftest.log 6 ok after; idempotent.diff empty; gate-red.log shows knowledge-index FAIL with a hand-broken index; two previously un-indexed notes now listed. Gotcha: the plan's example link text tripped check-docs (broken link) and blocked the plan commit until reworded. follow-up: hand-written index hooks were replaced by first headings; if a hook mattered, a docs unit moves it into that note's heading
