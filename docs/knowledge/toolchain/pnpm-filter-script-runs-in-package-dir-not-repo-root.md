# `pnpm --filter <pkg> <script>` runs the script from the package directory, not the repo root

Rule: `pnpm --filter @scope/pkg somescript` executes `somescript` with the package's own directory as the working directory, even though the filter is resolved from the workspace root. A script that depends on repo-root config — like a vitest workspace file at `vitest.workspace.ts` — must pass that root explicitly (e.g. `vitest run --root ../.. --project integration`) or it will look for the config relative to the package directory and fail to find it.

Why it matters: this broke the literal command written into U-010's Definition of Done (`pnpm --filter @falens/control test:integration`) on the first attempt, because the vitest workspace lives at the repo root. A DoD command written from the design of the tool (how `--filter` is *invoked*) rather than from how it *executes* will look right and fail the first time someone runs it. Run any command written into a Definition of Done at least once before committing it to the unit file.

Source: U-010, 2026-09-09.
