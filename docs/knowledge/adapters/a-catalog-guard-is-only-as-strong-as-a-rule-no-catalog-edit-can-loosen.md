# A catalog guard is only as strong as a rule no catalog edit can loosen

The http adapter's read-only guard is the source's `methods` list in the catalog: a step whose method is not in that list is blocked before any socket opens. That is sufficient only as long as the catalog itself is read-only in practice — the moment some source lists a writing method (`POST`, `PUT`, `PATCH`, `DELETE`), the guard alone would let the adapter write, because it is only checking list membership, not whether the method is safe.

The adapter therefore does not trust the catalog's method list on its own for write safety: it refuses any writing method outright unless the resolved source is explicitly marked as a sandbox (architecture §8's rule that write-tests run only against sandbox companies on non-prod). That sandbox flag lives outside the catalog's per-request data and cannot be set by editing a source's `methods` array — so a catalog edit that adds `POST` to some production source's method list still cannot make the adapter write against it. The general rule: when a guard reads its policy from a data file another unit can edit, ask what happens if that file is edited wrong, and put anything safety-critical behind a check the data file cannot express.

Source: U-012, 2026-09-09 (explore finding, confirmed by adapter-safety-reviewer round 2).
