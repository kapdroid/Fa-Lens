<!-- One unit per PR. Title: "U-012: <unit title>". The build skill fills this in; a human merges. -->

## Unit
- Unit: `U-xxx` — link: `docs/plan/units/U-xxx-….md`
- Tier: 1 / 2 / 3
- ADRs checked: ADR-…
- Design sections (UI only): components.md#…, screens.md#…

## What changed and why
Three to six sentences a reviewer can verify against the unit's Scope. No file lists here; the diff has those.

## Definition of Done (every box needs evidence, not a promise)
- [ ] `tool/gate.sh` green at head SHA `…` — evidence: `evidence/U-xxx/gate.log`
- [ ] Test that fails without the change and passes with it: `…` — evidence: `evidence/U-xxx/…`
- [ ] Unit-specific DoD items (copy from the unit file, one per line, each with its evidence path)
- [ ] Reviewer verdicts attached: adr-reviewer ✅ · design-reviewer ✅/n.a. · adapter-safety-reviewer ✅/n.a. — `evidence/U-xxx/review-*.json`
- [ ] Fresh-eyes summary matches Scope (tier 3) — `evidence/U-xxx/fresh-eyes.md`
- [ ] Docs updated where a decision or a visual moved: ADR / `docs/design/` / `docs/knowledge/`
- [ ] Unit file `## Progress` closed with the PR link; `status: review`

## Screenshots / recordings (UI units)
Light + dark, comfortable + dense where relevant.

## Out of scope noticed (becomes new units, not commits here)
- …
