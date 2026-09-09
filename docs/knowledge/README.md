# Knowledge notes

One lesson per file: a gotcha, a non-obvious convention, a tool quirk, or a wrong assumption that cost a builder time and that the code or an existing doc does not already say. Written by the memory-scribe agent after a unit's PR opens (`/build` state 8), or by a human who hit the same thing twice.

Conventions:
- Path: `docs/knowledge/<area>/<slug>.md`, one topic per file, area matches the unit's `owner` or the part of the tree the lesson concerns (e.g. `harness`, `sources`, `adapters`, `ui`).
- Every note ends with a `Source:` line naming the unit id and the date the lesson was learned, e.g. `Source: E-004, 2026-09-09`.
- Keep it short: what the surprise was, why it happened, what to do differently. No restating the ADR or the code; link to it instead.
- Superseding a note: add a new note with the current date and a link back; do not silently delete the old one if it is still partially true. If it is fully obsolete, delete it and say so in the superseding note.

## Index

| Area | Note | Summary |
|---|---|---|
| harness | [config-validator-allow-list-first](harness/config-validator-allow-list-first.md) | Hand-rolled config validators must be allow-list first and self-tested in the gate |
| sources | [catalog-server-names-unconfirmed](sources/catalog-server-names-unconfirmed.md) | Artifact-tool server names in the catalog are not confirmed replica endpoints until an adapter unit checks them |
