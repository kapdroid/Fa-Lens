---
id: U-025
title: Cover pg-boss job expiry (hang timeout), not just retry delay
status: draft
tier: 2
kind: service
depends_on: [U-011]
allowed_files:
  - packages/control/src/queue/**
  - packages/control/test/integration/queue.test.ts
adrs: [ADR-0004]
design: []
dod:
  - "a job whose handler hangs past its expiry is marked failed/expired and redelivered per pg-boss's expiry semantics, proven by a test that lets a handler hang rather than throw (packages/control/test/integration/queue.test.ts fails without the fix)"
  - "the existing retry-delay assertion (a job whose handler throws is redelivered after its retry delay) still passes"
  - "bash tool/gate.sh --fast is green"
evidence: [queue-expiry.log, gate.log]
estimate: S
owner:
---

# U-025 · Cover pg-boss job expiry (hang timeout), not just retry delay

## Scope
U-011's queue tests prove retry-after-throw and no-redelivery-after-completion, but pg-boss has a second failure mode this unit does not exercise: a handler that hangs (never resolves or rejects) past the job's `expireInSeconds`. pg-boss's expiry timeout is the mechanism that reclaims a job whose worker died or wedged, distinct from the retry delay that follows an explicit throw. This unit adds a test that lets a handler hang past a short expiry and asserts the job is marked expired/failed and becomes available for redelivery, confirming the 15-minute default (or a test-scoped shorter one) actually reclaims stuck jobs.

## Out of scope
No change to the default expiry value chosen in U-011 unless the new test reveals it is wrong. No sweeper for the `runs` table (ADR-0016's follow-up, a separate worker-unit concern).

## Plan
1. Test: a job sent with a short `expireInSeconds` and a handler that never resolves is, after expiry, redelivered to a second worker call — `packages/control/test/integration/queue.test.ts` gains this case and fails without any change (pg-boss should already do this; the test proves the config surface passes it through correctly).
2. Implement/adjust: whatever `src/queue/queue.ts` needs so `send`/`work` expose or default `expireInSeconds` correctly for this to pass.
3. Green: `pnpm --filter @falens/control test:integration` and `bash tool/gate.sh --fast`.

## Verification
- `pnpm --filter @falens/control test:integration -- queue.test.ts` → `evidence/U-025/queue-expiry.log`
- `bash tool/gate.sh --fast` → `evidence/U-025/gate.log`

## Progress
2026-09-09 · draft · created from U-011's Progress follow-up note (DoD wording moved from "expiry" to "retry delay" because that was the mechanism actually tested; expiry itself remained untested)
