# An error message from a driver must not reach the log verbatim

An http client's error messages routinely embed the request url, including its query string, in the text meant for a developer console (`fetch failed: GET https://host/path?token=...`). If an adapter logs `error.message` directly when a request fails, any secret that happened to be in the url — or just a value the product does not want persisted in a log store — goes out with it, defeating a redaction allow-list that was built to keep exactly this from happening.

The fix: the verdict that reaches the log for a failed call comes from a fixed, small vocabulary the adapter itself defines (`timeout`, `network error`, `source down`, `blocked · ...`, etc.), decided by classifying the failure, never by forwarding the underlying exception's message. The raw error is fine to inspect in-process (for the breaker's outcome, for a caller-visible `error` chunk if that chunk's own contract also excludes urls) but must never be interpolated into the log line.

Source: U-012, 2026-09-09 (adapter-safety-reviewer round 1 finding: driver messages carrying urls into logs).
