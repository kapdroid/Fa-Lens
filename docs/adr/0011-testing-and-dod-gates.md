# ADR-0011 — Testing pyramid and Definition-of-Done gates

Status: accepted · Date: 2026-09-09

## Context

FA Lens is itself a testing tool; its own quality bar must be visibly higher than the systems it tests. The user's build process (stage 4, orchestration) requires that every unit of work has a machine-checkable Definition of Done and that a session can run from plan to PR without human babysitting.

## Decision

Four gates, all runnable locally with one command (`pnpm gate`) and identical in CI:

1. **Static:** typecheck, ESLint, Stylelint tokens (ADR-0007), boundary check (ADR-0001), contract snapshot (ADR-0002), pack schema validation (ADR-0010).
2. **Unit (Vitest):** kernel is 100% pure and targets ≥ 90% line coverage; service use-cases with in-memory control plane; adapters' guards with fakes.
3. **Integration (Testcontainers):** Postgres control plane contract tests (queue, lock, bus, cache); adapter contract suite against MSSQL, Postgres, ClickHouse containers; API + worker end-to-end on a seeded pack.
4. **E2E (Playwright):** every screen in `docs/design/screens.md` in four states, both themes and densities; the five prototype scenarios re-enacted against the real app; deep-link restore; motion frame budget on the run page.

**Definition of Done for any change:** gate green at the PR head SHA; a Playwright or integration test that would fail without the change; ADR written or updated if a boundary or a decision moved; `docs/design/` updated if a visual changed; no new `TODO` without an issue id. Publishing a pack has its own gate: schema, missing variables, unreachable steps, read-only violations, dry-run against fixtures.

## Alternatives considered

- **Coverage-only gates.** Rejected: coverage without behavior tests is theater; the E2E scenarios are the real acceptance.
- **Manual QA sign-off.** Rejected: the product exists to remove exactly that.

## Consequences

- CI runtime is bounded by Testcontainers; adapters' suites run in parallel and are cached by image digest.
- Every ADR ends with "How we verify"; those checks are wired into `pnpm gate` where mechanically possible.
- Flaky tests are quarantined within a day or deleted; a flaky test in a testing tool is a credibility bug.

## How we verify

`pnpm gate` exists from the first commit and runs in CI on every PR; branch protection requires it. A weekly job re-runs the E2E scenarios against the beta deployment and posts the verdict to Slack.
