# ADR-0015 — Kernel may depend on pure, I/O-free libraries

Status: accepted · Date: 2026-09-09

## Context

ADR-0001 says "the kernel has zero runtime dependencies and no I/O". ADR-0003 says flows are "validated against a versioned JSON Schema owned by `@falens/kernel`" and extracted with JSONPath (`jsonpath-plus`), and ADR-0010 puts the pack validator in the kernel. The first kernel unit (U-007) cannot satisfy all three sentences at once: a JSON Schema validator, a YAML parser, and a JSONPath engine are either dependencies or a rewrite of three mature libraries inside the kernel. The purpose of the zero-dependency sentence was that the kernel stays pure, deterministic, unit-testable, and runnable in workers, the CLI, and the browser; none of that requires the kernel to reimplement parsing.

## Decision

The kernel may depend on libraries that are **pure**: no network, no file system, no process or environment access, no timers, deterministic for the same input, and loadable in a browser. The allowed list is explicit and small: `ajv` and `ajv-formats` (JSON Schema), `yaml` (YAML 1.2 parsing and serialisation), `jsonpath-plus` (JSONPath). Anything else needs a new row in this ADR. The kernel still performs no I/O: it takes text and objects in and returns objects and problems out. ADR-0001's sentence is read as "no I/O and no dependencies beyond the ADR-0015 list".

## Alternatives considered

- **Hand-rolled schema validator and YAML subset inside the kernel.** Rejected: three parsers to maintain, a YAML dialect contributors must learn, and ADR-0003's JSON Schema promise (schema files reviewers can read, `$schemaVersion` migrations) would be lost.
- **Validation outside the kernel (service or worker) with typed objects passed in.** Rejected: the CLI, the browser preview, and the publish gate would each need their own validation path, breaking parity by construction (ADR-0002).
- **Amend ADR-0001 in place.** Rejected: decisions are changed by a new ADR, never by editing history.

## Consequences

- `packages/kernel/package.json` lists exactly the four libraries; `tool/check-boundaries.mjs` continues to forbid any `@falens/*` import in the kernel, and a gate stage (added with the next kernel unit) fails when the kernel's dependency list grows beyond this ADR's rows.
- Bundle size of the browser preview grows by the four libraries; acceptable.
- Flow and pack schemas stay JSON Schema documents (draft-07 objects under `packages/kernel/src/pack/schemas/`), reviewable in PRs.

## How we verify

A test in `packages/kernel/test` reads `packages/kernel/package.json` and fails if `dependencies` contains a key outside the ADR-0015 list; `node tool/check-boundaries.mjs` stays green.
