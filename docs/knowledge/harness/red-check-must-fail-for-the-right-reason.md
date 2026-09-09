# A red check must fail for the reason the unit fixes

When a unit's DoD is "the rule now names X", the planned red check has to grep for
the *sentence* the unit will add, not just a keyword that already appears elsewhere
in the file. A plain `grep packs/_sources` on `.claude/rules/packs.md` matched an
unrelated existing line (the file already references the catalog path), so the
check passed red-or-green regardless of the fix — it proved nothing. The check was
corrected to grep for the exception sentence as a whole (`packs/_sources/**` and
`ADR-0013` together, on one line), which is 0 before the edit and 1 after.

Before trusting a red check, run it against the unedited file and confirm it fails
for the specific reason the unit exists, not for some accidental absence.

Source: U-003 (packs.md rule names the `_sources` exception), 2026-09-09.
