# ADR-0003 — Flow format: YAML, JSON-Schema validated, JSONPath extract

Status: accepted · Date: 2026-09-09

## Context

Flows are the source of truth (decision locked with the user, 2026-09-08). Postman, k6, JUnit, and Excel are import/export targets. Contributors are testers and developers who must be able to read a diff in a PR and write a flow without learning a programming language.

## Decision

A flow is a **YAML document** validated against a versioned **JSON Schema** owned by `@falens/kernel` (`flow.schema.json`, `$schemaVersion`). Steps are one of `request` (HTTP), `query` (SQL against a catalog source), `validate` (a pack rule), `wait`, `group`. Each step may `extract` values with **JSONPath** (`jsonpath-plus`) or column names, and `assert` with a declarative vocabulary: `status`, `schema`, `equals`, `lte/gte`, `rows`, `contains`, `matches`, `delta`. Variables use `{{name}}` and come from scope, extracts, fixtures, or generators. A **script step** exists as an escape hatch: a sandboxed JavaScript expression (`isolated-vm`), limited to transforming extracted data, with no network or filesystem, and flagged in the UI.

## Alternatives considered

- **Postman collection as the native format.** Rejected: opaque JSON, scripts as strings, no schema for our step kinds (SQL, validation), vendor-shaped.
- **Code-first flows (TS files).** Rejected: contributors would need a toolchain; review and AI generation are harder; the tool becomes a framework.
- **Gherkin.** Readable, but the step-definition layer is exactly the code we want to avoid.

## Consequences

- Import Postman/OpenAPI/HAR/curl → YAML; export YAML → Postman, k6, JUnit; both directions live in `@falens/worker` exporters.
- Schema evolution is explicit via `$schemaVersion` with migrations in the kernel; old runs keep the flow version they ran.
- The script escape hatch is the one place where determinism can be broken; it is sandboxed, time-limited (100 ms), and shown with a badge.

## How we verify

Every example flow in `packs/*` validates against the schema in CI. A round-trip test imports the `NewDashboardAPI` Postman collection, exports it, and re-imports it with no semantic diff. Fuzz test: random valid flows parse and serialize identically.
