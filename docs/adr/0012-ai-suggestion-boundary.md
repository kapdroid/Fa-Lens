# ADR-0012 — AI proposes; humans accept; runs are deterministic

Status: accepted · Date: 2026-09-09

## Context

The user wants AI to generate test scenarios and flows from specs, code, recordings, and bugs, and to explain failures, while the contributor decides what is added. A testing tool loses trust the moment a verdict depends on a model.

## Decision

AI has exactly four jobs, all outside the run path: **generate drafts** (flows, cases, rules) from an OpenAPI spec, indexed backend code (via the ADO MCP), a recorded session (HAR), or a bug/issue; **suggest edge cases** for an endpoint; **explain a failure** (advisory, shown with a badge, never changes the verdict); **summarize a run** for a report. Every output lands in the **Suggestions inbox** with its source, prompt hash, model id, and a preview-run verdict. Accept creates a **draft** in the module; publish is a separate human action. Runs never call a model. Models: `claude-sonnet-5` for generators and summaries, `claude-fable-5-1` for failure explanations (deeper reasoning, lower volume). All calls go through one `@falens/service/ai` client with request/response logging (redacted), token budgets per day per user, and a kill switch.

## Alternatives considered

- **AI-in-the-loop runs (model decides next step).** Rejected: non-reproducible verdicts.
- **Auto-accept high-confidence suggestions.** Rejected for v1; "confidence" is a model's opinion. A future rule may auto-accept previews that pass on all six tenants, and only into drafts.
- **Fine-tuned in-house model.** Unnecessary; the value is in grounding (schemas, code index, knowledge base), not in the model.

## Consequences

- Determinism is preserved: two runs of the same flow version on the same data produce the same verdict.
- AI cost is bounded and attributable; the inbox shows what was generated and what was discarded with a one-word reason.
- Generators are grounded with the flow JSON Schema and the source catalog, so drafts validate on first try most of the time; invalid drafts are shown with the validation errors, not silently dropped.

## How we verify

A test asserts no `ai` import in `kernel`, `adapters`, or the run handlers in `worker` (boundary check). A determinism test runs a flow twice against fixtures and diffs the verdicts byte-for-byte. Every suggestion row has non-null `source`, `model`, `prompt_hash`, and `status ∈ {new, accepted, discarded}`.
