---
id: U-001
title: Gate runs the zero-dependency tool tests as a stage
status: draft
tier: 1
kind: harness
depends_on: [E-002]
allowed_files:
  - tool/gate.sh
adrs: [ADR-0011]
design: []
dod:
  - "bash tool/gate.sh --fast prints a stage line for tool-tests and runs every tool/test/*.test.mjs"
  - "a deliberately failing test under tool/test/ turns the gate red (evidence/U-001/red.log), removing it turns it green"
  - "bash tool/gate.sh --fast is green"
evidence: [red.log, gate.log]
estimate: S
owner:
---

# U-001 · Gate runs the zero-dependency tool tests as a stage

## Scope
Follow-up from E-002's adr-reviewer: the new test file under tool/test/ is not executed by the gate. Add one stage `tool-tests` to tool/gate.sh that runs every tool/test/*.test.mjs (skips loudly when the folder is empty). No other gate change.

## Out of scope
No new tests, no package.json, no CI wiring.

## Plan
(written by /build)

## Verification
- add a temporary failing test file, run the gate (red), remove it, run again (green); logs under evidence/U-001/

## Progress
