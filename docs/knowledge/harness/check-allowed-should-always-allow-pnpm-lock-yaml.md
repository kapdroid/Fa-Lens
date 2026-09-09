# Any unit that adds a dependency must list `pnpm-lock.yaml` in `allowed_files` until the harness always allows it

`pnpm add` rewrites `pnpm-lock.yaml`, and `tool/check-allowed.mjs` rejects a diff that touches a file outside the unit's `allowed_files`. U-007 hit this on its first plan pass: adding the ADR-0015 libraries failed the allowed-files check until `pnpm-lock.yaml` was added to the unit file's `allowed_files` list by hand.

Until `tool/check-allowed.mjs` is changed to always allow `pnpm-lock.yaml` (a lockfile diff is a mechanical consequence of a dependency change the reviewer already checks via `package.json`, not a scope widening in itself), every unit whose plan adds a dependency needs to add `pnpm-lock.yaml` to its own `allowed_files` up front, or the plan step will fail on this the same way.

Source: U-007, 2026-09-09
