---
id: U-009
title: Kernel declarative rules to SQL text, fingerprint diff, cause vocabulary, and date windows
status: in_progress
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
1. Tests first (red): `packages/kernel/test/rules/fixtures.ts` holds one rule per type as plain objects in the shape packs already write (`id`, `type`, `source`, `table`, `keys`, `columns`, `anchor`, `enrich`, `window`), plus a scope. `compile.test.ts` asserts, for every rule type across the mssql, postgres and clickhouse dialects, that the statement starts with SELECT or WITH, contains no semicolon, carries no interpolated scope literal (values arrive as named parameters), and equals the expected statement written inline in the test. `fingerprint.test.ts` asserts `bucketFingerprint` is stable and order-independent, and that `diffFingerprints(anchor, enrich)` returns exactly the differing buckets, each classified with one of the six cause words. `windows.test.ts` asserts a 31-day range splits into windows of at most 7 days that cover it exactly without overlap, and that a 32-day interactive range throws `InteractiveRangeTooLarge`. Run `pnpm -s vitest run packages/kernel/test/rules` → red → `evidence/U-009/red.log`.
2. `src/rules/types.ts`: the `Rule` union narrowing the six types from `RULE_TYPES`, `Dialect = 'mssql' | 'postgres' | 'clickhouse'`, `CompiledStatement { sql, params, dialect }`, and the `Cause` union with a comment defining each word.
3. `src/rules/dialect.ts`: the only place dialects differ — identifier quoting (`[x]`, `"x"`, backticks), parameter syntax (`@p1`, `$1`, `{p1:String}`), date truncation, and the hash function used for a bucket's row hash. No driver imports; string building only.
4. `src/rules/compile.ts`: `compileRule(rule, dialect, scope)` per type — `presence` and `uniqueness` as single-source counts, `field_match` as a keyed comparison, `aggregate_match` as the anchor and enrich fingerprint statements, `chain` as an ordered set of statements, `custom-check` as the referenced statement carried through untouched. Scope values (company, date range) are always parameters, never concatenated, so the ADR-0005 guard cannot be tripped by a value. A `guardOk(sql)` helper asserts the SELECT/WITH-only, no-semicolon shape and is called on every statement the compiler returns.
5. `src/rules/fingerprint.ts`: `bucketFingerprint(rows, keys, measures)` producing `{ key, count, sums, hash }` with the hash over `canonicalJson`, and `diffFingerprints(anchor, enrich, options)` returning the differing buckets with a `cause` from the definitions recorded in Progress and a delta per measure.
6. `src/rules/windows.ts`: `splitWindows({ dateFrom, dateTo }, { maxDays = 7, interactive })` returning contiguous windows, and `InteractiveRangeTooLarge` (an Error whose `name` is that string) when an interactive range exceeds 31 days. Extend `src/index.ts` with the new exports, keeping every existing export.
7. Green: the same vitest command → `evidence/U-009/test.log`; `pnpm -s typecheck`, `pnpm -s lint`, `node tool/check-boundaries.mjs`; `bash tool/gate.sh --fast` → `evidence/U-009/gate.log`.

## Verification
- `vitest packages/kernel/test/rules` red before, green after → `evidence/U-009/test.log`
- `bash tool/gate.sh --fast` → `evidence/U-009/gate.log`

## Progress
2026-09-09 16:55 · ready · set by /build on the owner's instruction (U-008 merged in PR #20)
2026-09-09 16:59 · intake · brief ok; status ready set in this branch on the owner's instruction (U-008 merged in PR #20)
2026-09-09 16:59 · explore · findings recorded; 3 non-blocking questions decided here. (1) The six cause words are named in docs/design/screens.md but never defined, so this unit defines them and the owner should confirm: balanced = the two sides agree; physical short = the anchor side counts more than the enrich side (FA over DMS, the Δ>0 case from the van-sales rules); sync gap = the bucket exists on the anchor side and is absent on the enrich side; audit pending = the enrich side is behind only inside a grace window of recent days; duplicate = one side's row count exceeds its distinct key count; unexplained = any other difference. (2) Expected SQL is asserted with inline strings, the house style everywhere else in the kernel, not vitest .snap files. (3) InteractiveRangeTooLarge is an Error subclass whose name field is that string, so the API can map it to 409 range_too_large without importing the class. Dialect stays a parameter: the kernel must never read packs/_sources/catalog.yaml
2026-09-09 16:59 · isolate · worktree /Users/kapdroid/StudioProjects/Fa-Lens.worktrees/U-009-kernel-rules-sql
2026-09-09 17:04 · build · gate --fast green at 7be9c1a; red.log shows compileRule/classify missing before, 21 rules tests and 55 kernel tests green after. Two design points the tests forced: a repeated key is read as duplicate before the two sides are compared for agreement, because a duplicate is a defect even when both sides repeat it; and bucketFingerprint takes an explicit identity column set (defaulting to the bucket keys) since a bucket legitimately holds many rows, so duplicates can only be judged against what should be unique. follow-up: rules carry company_column and date_column with defaults CompanyId and CreatedOn; ruleSchema in packages/kernel/src/pack/schemas accepts them as additional properties but does not name them (that file is outside this unit) — a later unit should name them
