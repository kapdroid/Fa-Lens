# A unit's Plan must describe example links in words, not write a placeholder markdown link

`tool/check-docs.mjs` resolves every markdown link in every tracked file, including a `## Plan` section that is only describing what a future link will look like (e.g. an example of a broken link the unit is meant to fix or produce). A placeholder link such as `a link whose text is "note" and whose target is the note path` with a target that does not exist on disk fails the same broken-link check as a real one, and blocks the commit of the plan itself before any code exists to make the target real.

The fix is to not write an example as a literal markdown link at all: describe it in prose ("a list item whose link text is the first heading and whose target is the note's area-relative path") or, if a concrete path is needed, point at a real file that already exists in the repo.

Source: U-005, 2026-09-09.
