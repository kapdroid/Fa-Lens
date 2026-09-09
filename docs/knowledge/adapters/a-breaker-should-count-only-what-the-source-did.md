# A breaker should count only what the source did

A per-host circuit breaker exists to detect a source that is actually failing, so it must only count outcomes that reflect the source's own behaviour. Two cases look like failures but are not the source's fault, and counting them opens the breaker on a source that is perfectly healthy: a run the caller cancelled (the abort came from this side, not from the source refusing or timing out), and a redirect (a 3xx response is a misconfiguration of the call, not evidence the source is down — the adapter refuses redirects outright rather than following them, per ADR-0005, and a refused redirect must not feed the failure count either).

The rule: before wiring any outcome into `breaker.recordFailure()`, ask whether the outcome proves the source is unhealthy, or just that this particular call didn't complete as this side wanted it to. Only the former belongs in the count.

Source: U-012, 2026-09-09 (adapter-safety-reviewer round 2 finding).
