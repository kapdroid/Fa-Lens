# ADR-0009 — MCP tools are generated from service verbs

Status: accepted · Date: 2026-09-09

## Context

"Whatever the UI can do, an agent can do" is a product requirement, and the user wants Claude to run and create tests conversationally. Hand-written MCP tools drift from the API the same way hand-written CLIs do.

## Decision

`@falens/mcp` is a thin server built on `@modelcontextprotocol/sdk` whose **tools are generated from the same Zod verb registry** as the API and CLI (ADR-0002). Tool names are the verb names (`list_modules`, `get_matrix`, `run_flow`, `run_validation`, `get_run`, `get_results`, `explain_failure`, `create_flow_draft`, `create_case_draft`, `export_flow`, `import_postman`, `list_suggestions`, `accept_suggestion`). Long-running verbs return a `runId` immediately; `get_run` is pollable and `wait_run` blocks up to a client-supplied timeout. Every MCP call carries an `agent` token (ADR-0008) and is audited like a UI action. Write-shaped verbs (`create_*_draft`, `accept_suggestion`) create **drafts only**; publishing remains a human action in the UI or CLI with a contributor role.

Resources exposed read-only: the source catalog (names, dialects, no credentials), pack schemas, and the flow JSON Schema, so an agent can author valid YAML without guessing.

## Alternatives considered

- **Separate, agent-optimized tool set.** Rejected: drift, and two behaviors to test.
- **Letting agents publish directly.** Rejected: violates the AI boundary (ADR-0012).
- **Exposing raw SQL to agents.** Rejected; agents use catalog sources through flows, which go through the adapter guard.

## Consequences

- New verb → new tool automatically, with schema and description.
- Tool descriptions must be written for models: each verb schema carries a `description` and examples that also feed the OpenAPI docs.
- The ADO MCP the team already uses stays a separate, discovery/triage tool; FA Lens's MCP is for running and authoring tests.

## How we verify

The contract test (ADR-0002) asserts the MCP tool list equals the verb registry. An integration test drives the MCP server with the reference client to `run_flow` → `wait_run` → `get_results` and asserts the same `runId` appears in the ledger and the UI. Attempting `publish_*` over MCP is asserted to be absent from the tool list.
