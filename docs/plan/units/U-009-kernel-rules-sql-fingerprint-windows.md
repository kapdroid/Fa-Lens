---
id: U-009
title: Kernel declarative rules to SQL text, fingerprint diff, cause vocabulary, and date windows
status: draft
tier: 1
kind: kernel
depends_on: [U-007]
allowed_files:
  - packages/kernel/src/rules/**
  - packages/kernel/src/index.ts
  - packages/kernel/test/rules/**
adrs: [ADR-0010, ADR-0005, ADR-0014]
design: []
dod:
  - "`vitest packages/kernel/test/rules` fails without the compiler and passes with it: every statement generated for the fixture rules on the mssql, postgres, and clickhouse dialects starts with SELECT or WITH, contains no semicolon, and matches its snapshot"
  - "`diffFingerprints(anchor, enrich)` on the fixture buckets returns exactly the expected differing buckets, and each is classified with one of the cause words sync gap, audit pending, unexplained, physical short, duplicate, balanced (test packages/kernel/test/rules/fingerprint.test.ts)"
  - "`splitWindows()` turns a 31-day range into windows no longer than 7 days and rejects a 32-day interactive range with `InteractiveRangeTooLarge` (test packages/kernel/test/rules/windows.test.ts)"
  - "bash tool/gate.sh --fast is green"
evidence: [test.log, gate.log]
estimate: M
owner:
---

# U-009 · Kernel declarative rules to SQL text, fingerprint diff, cause vocabulary, and date windows

## Scope
Data validations are declarative rules in packs (ADR-0010) that workers execute read-only through adapters (ADR-0005). The kernel owns the pure half: `compileRule(rule, dialect, scope)` turns each declarative rule type into parameterised SELECT-only SQL text for the mssql, postgres, and clickhouse dialects (string building only, never execution, so the adapter statement guard always accepts the output); the aggregate-first fingerprint model of ADR-0014 (`bucketFingerprint` per day and key with count, sum, and hash; `diffFingerprints` comparing the anchor side with the enrich side and returning only the differing buckets); the cause vocabulary applied to a differing bucket (sync gap, audit pending, unexplained, physical short, duplicate, balanced), in plain words as the design contract requires; and `splitWindows(range)` producing the ≤ 7-day windows workers checkpoint on, with the 31-day interactive cap.

## Out of scope
No database calls (U-013). No shadow index (v1.5). No UI. The van-sales rules themselves are pack content (a later pack unit); this unit ships only synthetic fixtures.

## Plan
(written by /build)

## Verification
- `vitest packages/kernel/test/rules` red before, green after → `evidence/U-009/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-009/gate.log`

## Progress
