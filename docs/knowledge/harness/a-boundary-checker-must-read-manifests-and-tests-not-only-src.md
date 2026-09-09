# A boundary checker that reads only source misses the two places a rule is usually broken first

A dependency-direction rule (packages/*/src imports) is usually crossed before any source file imports anything: first in the manifest, when `@falens/service` is added to a lower layer's `package.json` because a test needs it, and then in a test file under `packages/*/test/`, which a `src/**`-only walk never visits. `node tool/check-boundaries.mjs` passed on exactly this case in U-014 (see `docs/knowledge/service/a-layering-rule-holds-only-where-something-checks-it.md`) because it walked source imports only.

Fixing this for real means the checker has to read every field in `package.json` that can carry a `@falens/*` edge — `dependencies`, `devDependencies`, `optionalDependencies`, and `peerDependencies` — not just the first one or two that come to mind. During review of U-028, a first pass covered only `dependencies`/`devDependencies`; a reviewer note caught that an edge declared under `optional` or `peer` would still be invisible, and the rule could be routed around by naming the field the checker didn't read.

Source: U-028, 2026-09-09.
