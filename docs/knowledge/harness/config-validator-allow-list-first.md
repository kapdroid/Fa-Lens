# Hand-rolled config validators must be allow-list first and self-tested in the gate

A zero-dependency YAML-subset validator (`tool/check-catalog.mjs`) that checked known-bad keys with a blocklist was bypassable in ways the first pass missed: top-level keys outside the expected set went unscanned entirely, a duplicate key silently took the last value instead of erroring, `__proto__`/`constructor`/`prototype` keys could poison the parsed object, and an "exempt from the secret check" rule written path-agnostically (e.g. any key named `credential`) exempted the same key name anywhere in the document, not just where it was meant to.

The fix pattern that held up under a second adversarial review:
- Parse into a null-prototype map (`Object.create(null)`) and reject `__proto__`/`constructor`/`prototype` keys explicitly; a plain `{}` literal is not safe against a JSON/YAML source with those keys.
- Validate top-level keys against an explicit allow-list first, then walk the whole document for the blocklist — allow-list first, blocklist second, never blocklist-only.
- Give every "kind" of node (SQL source, HTTP source, coming-soon source) its own key allow-list; do not reuse one generic list for shapes that should differ.
- Any path-based exemption (e.g. "credential values are allowed to look like a connection string only here") must check the exact path, not just the key name, or it silently exempts every occurrence of that key.
- Ship a `--selftest` mode that mutates a known-good config into a list of known-bad shapes in memory and asserts each one is rejected with the expected message, then wire that selftest into the gate as its own stage (not just the happy-path validation run). This is what stood in for a third human review round once the reviewer's per-round agent budget was reached — a deterministic selftest is repeatable evidence a review round is not.

Source: E-004, 2026-09-09
