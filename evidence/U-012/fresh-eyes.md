# Fresh eyes on U-012

Scope match: **yes**, with additions the reviewer named and the builder acknowledges.

The diff defines the Adapter contract and the http adapter: an origin guard that refuses before any socket,
per-origin permits and a breaker, byte and row caps that set `truncated`, a fixed error vocabulary, and a
log line built field by field. Thirty-nine tests cover each of those.

Additions beyond the scope sentence, all from the two safety-review rounds and all recorded in Progress:
the sandbox rule for writing methods, https enforcement with an opt-in loopback allowance, header stripping,
redirect refusal, caller cancellation, and a shared per-origin budget registry.

Caught by fresh eyes and acted on:
- The per-suite logs and `summary.json` predated the review fixes; the evidence was re-run at the current head.
- The plan named `src/http/log.ts`; the fingerprint lives in `report()` inside the adapter instead.
- `countRows` shortens the parsed body in place when the row cap bites, so `body` is truncated as well as `rows`.
  That is what `truncated: true` reports, and it is now said out loud here.
- `health` returns not-ok for a source whose catalog entry omits HEAD, rather than sending one anyway.
- Merging this locks in a guard whose catalog counterpart does not exist yet: the van-sales POST steps stay
  refused until U-027 adds a sandbox source. That is the intended order, and U-027 is drafted.
