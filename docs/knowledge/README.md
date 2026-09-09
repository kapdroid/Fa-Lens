# Knowledge

Lessons a future builder would otherwise re-learn: gotchas, non-obvious conventions, tool quirks, wrong assumptions that cost time. Written by the memory-scribe step after a unit's PR opens.

## Conventions
- One lesson per file, named `docs/knowledge/<area>/<slug>.md`.
- Every note ends with a `Source:` line naming the unit id and date.
- Write for a reader who was not in the conversation: say what the lesson is, why it matters, and where to see it applied.
- Skip anything the code or an existing doc already states; do not duplicate ADRs, `docs/design/`, or `docs/architecture.md` — link to them instead.
- Keep notes short (a few paragraphs). If a lesson grows into a policy, it belongs in an ADR or a design/rule doc, not here.

## Index

### design
- [One primary button per screen](design/one-primary-per-screen.md) — an EmptyState's action button must not compete with the page header's single primary button; use the accent variant when the header already owns the primary for that scope.
