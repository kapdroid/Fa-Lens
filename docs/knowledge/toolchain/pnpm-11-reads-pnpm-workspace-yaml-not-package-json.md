# pnpm 11 reads its build/dep settings from `pnpm-workspace.yaml`, not `package.json`'s `pnpm` field

Rule: fields like `allowBuilds` (approved native-build packages, e.g. `esbuild`) and `verifyDepsBeforeRun` live in `pnpm-workspace.yaml` under pnpm 11, not in a `pnpm` key inside the root `package.json` (the older convention). After running `pnpm approve-builds` — especially unattended or interactively-interrupted — read `pnpm-workspace.yaml` back before committing: it can leave a literal placeholder string (`esbuild: set this to true or false`) in the `allowBuilds` block instead of a real `true`/`false`. That placeholder is not caught by a normal `pnpm install` in a warm store, but it makes `pnpm install --frozen-lockfile` fail with `ERR_PNPM_IGNORED_BUILDS` against a clean store/cache — exactly the state a fresh clone or a CI runner starts from.
Why: the settings-location move is undocumented enough to cost real time hunting through `package.json` first; the placeholder failure mode is silent locally (a warm local build-approval cache masks it) and only shows up on a genuinely fresh install, which is easy to never test before merging.

Source: U-006, 2026-09-09.
