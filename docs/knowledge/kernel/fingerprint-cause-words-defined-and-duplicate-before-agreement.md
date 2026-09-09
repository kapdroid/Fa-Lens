# The six fingerprint cause words, and why duplicate is judged before agreement

The design contract (`docs/design/screens.md`) names six cause words for a differing fingerprint bucket — `balanced`, `physical short`, `sync gap`, `audit pending`, `duplicate`, `unexplained` — but never defines them. U-009 settled the definitions:

- **balanced** — the two sides agree.
- **physical short** — the anchor side counts more than the enrich side (the FA-over-DMS case, `Δ > 0` in the van-sales rules).
- **sync gap** — the bucket exists on the anchor side and is absent on the enrich side, and the absence is past the grace window.
- **audit pending** — the same absence, but still inside the grace window (recent).
- **duplicate** — one side's row count exceeds its distinct-identity count.
- **unexplained** — any other difference.

`duplicate` is checked before the two sides are compared for agreement, because a repeated key is a defect even when both sides repeat it the same number of times — a bucket that looks `balanced` by count can still be a duplicate on both sides, and that must classify as `duplicate`, not `balanced`.

Source: U-009, 2026-09-09 (design contract left these undefined; settled during explore and recorded in `packages/kernel/src/rules/types.ts`).
