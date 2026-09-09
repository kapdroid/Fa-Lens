# An allow-list must compare origins, not hosts

Comparing only the hostname between a resolved call and the catalog's `baseUrl` lets the scheme drift: an https source could be called over plain http and still pass, because `example.com` matches `example.com` regardless of which scheme asked. The consequence is not cosmetic — the caller's bearer token goes into the request either way, so a scheme mismatch sends it in the clear.

The fix compares the full origin (scheme + host + port), not the host alone, and adds two refusals a host-only check would miss: a url carrying userinfo (`user:pass@host`), and a scheme the URL parser does not recognise as special (`http`, `https`, `ws`, `wss`, `ftp`, `file`) — both of these make `new URL(...).origin` return the literal string `"null"`, so two different unrecognised urls would otherwise compare as equal to each other and to nothing in particular. Plain http is allowed only on loopback and only when the caller opts in explicitly; every other case must match origin-for-origin against the catalog.

Source: U-012, 2026-09-09 (adapter-safety-reviewer round 1 finding).
