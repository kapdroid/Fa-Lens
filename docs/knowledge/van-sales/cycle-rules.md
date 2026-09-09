# Van Sales: the six locked cycle and mapping rules

These rules were verified line by line against the two working artifact tools (VanStock Cyclewise Explorer and Van Sales Mapping Validator) and against live Mars data. The van-sales pack encodes them; do not "simplify" them without a new ADR.

## 1. A cycle opens on an approved PureDayStart and closes on an approved Complete VanDayEnd
Rule: `IsDayStartStock = 1`, not additional, `IsApproved = 1` opens a cycle; `IsDayStartStock = 0`, `LoadType ≠ 6`, `IsApproved = 1` closes it. Exactly one van per employee per cycle.
Why: every reconciliation compares stock at these two boundaries; a wrong boundary makes every product row wrong.

## 2. A Partial VanDayEnd never closes a cycle
Rule: `LoadType = 6` rows are interim snapshots; any number can occur before the real close (up to five seen in live data). Their quantities are tracked separately and combined with the Complete end for totals.
Why: treating a partial end as a close splits one real cycle into several and produces false mismatches.

## 3. Additional stock is a mid-cycle top-up, never a boundary
Rule: `IsDayStartStock = 1` with `IsAdditionalStock = 1` adds to the cycle's start-side quantity and does not open or reset anything.
Why: the expected end is start plus additional minus sales; dropping additional stock flags every topped-up cycle as short.

## 4. A cycle's sales window is its own first and last recorded event timestamps
Rule: sessions are attributed to a cycle when their `CreatedAt` falls inside `[startCreatedAt, endCreatedAt]`; attendances must have `IsVanSales = 1`, `IsValid = 1`, `Productive = 1`. Sessions in the gap between two cycles belong to neither.
Why: using DayRecords or a same-SessionId join collapsed distinct cycles in earlier attempts; the raw timestamps proved correct.

## 5. A new PureDayStart while the previous end is still pending is an approval violation, and the new cycle still opens
Rule: a pending (`IsApproved = 0`) Complete end does not close the cycle; if a new PureDayStart arrives before an approved end, the previous cycle is flagged `approvalViolation` and the new cycle opens anyway. A pending end that is truly the last event closes the cycle with `endApproved = false`.
Why: the tool reflects what the data shows; hiding the violation would hide a real process failure in the field app.

## 6. In the mapping validator only "beat distributor ≠ van distributor" is an error; every other broken link is a warning
Rule: the beat chain (employee → position → beats → distributor) and the van chain (employee → van → distributor) are compared as sets; if either side is empty the status is `n/a`, not a mismatch. Missing positions, beats, mappings, or inactive distributors are warnings. The van side is de-duplicated on (employee, distributor), never on van id.
Why: an explicit severity model the product owner chose; and the van-id de-duplication bug once produced false mismatches for employees with two vans on one distributor.

Source: artifact-tool logic extractions dated 2026-09-08 (`VanStock Cyclewise Explorer — Complete Logic Extraction`, `Van Sales Mapping Validator — Full Technical Specification`), summarized in `.claude/rules/packs.md`; recorded by unit E-001 on 2026-09-09.
