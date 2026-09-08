# Work plan

Everything FA Lens builds is a **unit** in `units/`. The format is `docs/plan/unit.schema.json`; the template is `units/_template.md`; the loop that consumes a unit is `docs/orchestration.md`.

- `U-xxx` real units (product work). `E-xxx` harness evals (prove the loop works).
- Only a human moves a unit to `status: ready`. `/build U-xxx` takes it from there.
- Units are small: `estimate: S` (part of a session) or `M` (one session). An `L` is split before it becomes ready.
- Units must not overlap on `allowed_files` while active (`tool/check-units.mjs` enforces it).

Backlog ordering for stage 5 follows `docs/architecture.md` §2 dependency direction: kernel → control → adapters → service → api/worker → mcp/cli → ui/web → packs. Each unit names the ADRs it must satisfy so the reviewer has a rubric.

See `units/` for the current list; `node tool/check-units.mjs` prints the count and validates them.
