# ESLint config must ignore `.claude/**` and `tool/**`

Rule: the root `eslint.config.mjs` needs explicit `ignores` entries for `.claude/**` and `tool/**` alongside the usual build-output ignores.
Why: harness scripts under `tool/` (and any script-like files under `.claude/`) are deliberately zero-dependency Node, written to run under plain `node` without the app's TypeScript project config or dependency graph. Running the app's lint rules (parserOptions tied to `tsconfig.base.json`'s project, import-resolution rules expecting workspace packages) against them either errors on "file not in any tsconfig" or flags patterns that are normal for a dependency-free script but wrong for app code — false failures that block the gate for reasons unrelated to the app.

Source: U-006, 2026-09-09.
