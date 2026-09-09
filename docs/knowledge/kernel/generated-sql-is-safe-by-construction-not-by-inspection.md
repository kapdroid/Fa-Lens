# Generated SQL is safe by construction, not by inspection

`compileRule` never trusts a pack-authored value to be safe by checking it — it makes the unsafe shape impossible. Scope values (company, date range) are always passed as named parameters, never concatenated into the SQL string. Identifiers go through a strip that removes everything outside letters, digits, and underscore before they are quoted, so no pack-authored name can break out of its quoting and no value can smuggle a second statement past ADR-0005's read-only guard.

A `guardOk(sql)` helper then asserts the shape every statement the compiler returns must have: starts with `SELECT` or `WITH`, contains no semicolon. This is a second, independent check on the *output*, not the input — it exists to catch a compiler bug, not to sanitize an attacker.

Source: U-009, 2026-09-09 (`packages/kernel/src/rules/compile.ts`, `packages/kernel/src/rules/dialect.ts`).
