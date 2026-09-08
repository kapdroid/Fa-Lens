---
paths:
  - "docs/**"
  - "*.md"
---
# Docs

- A decision that moved gets a new ADR (`docs/adr/NNNN-slug.md`) with Context, Decision, Alternatives considered, Consequences, How we verify, and a row in `docs/adr/README.md`. Superseded ADRs get `Status: superseded by ADR-NNNN`; never rewrite history.
- `docs/architecture.md` is the map; when an ADR changes the shape, update the map in the same PR.
- Keep `CLAUDE.md` and `AGENTS.md` short; move procedures into skills and area rules into `.claude/rules/`.
- Relative links must resolve (`tool/check-docs.mjs` fails otherwise).
- Write for a reader who was not in the conversation: say who decided what and when, name the file to look at, avoid session-invented names.
