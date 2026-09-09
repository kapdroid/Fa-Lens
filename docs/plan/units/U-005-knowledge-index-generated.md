---
id: U-005
title: Generate the docs/knowledge index instead of hand-editing it
status: draft
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
(written by /build)

## Verification
- generate twice, `git diff --stat docs/knowledge/README.md` empty after the second run → `evidence/U-005/idempotent.diff`
- temporarily break the index by hand, gate red; regenerate, gate green → `evidence/U-005/gate.log`

## Progress
