---
paths:
  - "packs/**"
---
# Packs (data, not code)

A pack is YAML/JSON only (ADR-0010). Flows follow ADR-0003; rules use the five declarative types; sources come from `packs/_sources/catalog.yaml` by logical name.

- No scripts, no code, no credentials, no server names in a pack. If a check cannot be expressed declaratively, write the gap into the unit's Progress; it becomes a kernel or adapter unit.
- Every flow, rule, and case validates against the kernel schemas; run `tool/gate.sh` before committing.
- Business rules that a newcomer would get wrong go into `knowledge/*.md` in the pack, one gotcha per file, with the source (ticket, investigation date, table names).
- Van Sales facts that are already locked (from the artifact tools): cycles open on PureDayStart and close on approved Complete VanDayEnd; Partial VanDayEnd never closes; Additional stock is a mid-cycle top-up; sales window is the cycle's own start/end timestamps; only the beat-vs-van distributor mismatch is an error in the mapping validator, everything else is a warning.
