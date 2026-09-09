# One primary button per screen

A screen's page header owns exactly one primary button for its scope (ADR-0007's tokens-only vocabulary distinguishes `primary` from `accent`). When a component elsewhere on the same screen also needs a call-to-action button — an `EmptyState`, a card action, an inline prompt — it must not also render `primary`, or the reader sees two buttons claiming to be "the" action and has to guess which one actually is.

The fix used in `docs/design/components.md` (EmptyState): the component's button defaults to `accent`, and is only `primary` in the rare case where nothing else on the screen — specifically the page header — already carries a primary for that scope. This is a rule to check for any new component that renders a button, not just EmptyState: before choosing `primary`, check whether the header (or another region on the same screen) already has one.

Practical check when reviewing a component spec: read the anatomy against the screen(s) it appears on and ask "does this screen already have a primary button for this scope?" If yes, the new button is `accent` (or `secondary`), never a second `primary`.

Source: E-003, 2026-09-09
