---
name: unit
description: Drafts a new FA Lens work unit file in docs/plan/units with a machine-checkable Definition of Done, correct tier, allowed files, and ADR references, by asking the few questions that matter. Use when a human describes a piece of work to add to the plan, or says "/unit <outcome>".
disable-model-invocation: true
argument-hint: "<one-line outcome>"
---

# Draft a work unit

Turn "$ARGUMENTS" into a unit file that a fresh session can build without asking questions. The unit is a contract: Scope says what, Out of scope says what not, `allowed_files` says where, `dod` says how we know, `tier` says who approves.

Existing units, for numbering and overlap:

!`ls docs/plan/units/ 2>/dev/null | sed 's/^/  /' || true`

## Steps

1. Read `docs/plan/unit.schema.json` and `docs/plan/units/_template.md`. Pick the next free `U-xxx` id.
2. Decide `kind` and `tier` from the files the work touches: docs/pure code → tier 1; service or UI → tier 2; adapters, workers, sources, auth → tier 3. Name the ADRs that constrain it (search `docs/adr/README.md`); for UI, name the `docs/design` sections.
3. Ask the human, with `AskUserQuestion`, only what you cannot derive: the boundary of scope when two readings differ, the acceptance signal when none is obvious, dependencies on other units. One round of questions, at most three.
4. Write the file from the template. DoD items must each name a command, a test, or a checkable artifact ("`node tool/x.mjs` exits 1 when…", "`vitest …` fails without the change", "file X exists and contains Y"). Run the linter and fix any item it rejects:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/lint-dod.mjs" docs/plan/units/U-xxx-slug.md
```

5. Leave `status: draft`. Run `node tool/check-units.mjs`; it must be green (including no `allowed_files` overlap with active units).
6. Report the path and the DoD list. A human sets `status: ready` after reading it; do not set it yourself.

Keep the unit small: `estimate: S` or `M`. If it needs `L`, split it into two units with a `depends_on` and say so.
