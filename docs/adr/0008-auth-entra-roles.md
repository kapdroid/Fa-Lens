# ADR-0008 — Identity: Entra OIDC, four roles, scoped MCP tokens

Status: accepted · Date: 2026-09-09

## Context

FA Lens has two modes the user asked for: a dev/admin mode where anyone can do testing-level work, and a validation mode where people run published flows and read results. FieldAssist already uses Microsoft Entra for staff identity and Azure Key Vault for secrets. Agents (Claude via MCP, CI pipelines) need machine identity with narrow scope.

## Decision

Human login is **OIDC against Microsoft Entra** (authorization code + PKCE, BFF pattern: the API holds the session in a signed, HttpOnly cookie; no tokens in the browser). Roles come from **Entra group claims** mapped in config to four FA Lens roles:

| Role | Can |
|---|---|
| `admin` | everything + sources, credentials refs, roles, packs install |
| `contributor` | create/edit drafts, publish packs and flows, run anything, accept suggestions |
| `validator` | run **published** flows/validations, read results, export, share links |
| `agent` | machine role for MCP/CI tokens: a subset of contributor or validator verbs, chosen at token creation |

**MCP and CI tokens** are minted by admins: scoped (allowed verbs, allowed companies/tenants), expiring (max 90 days), revocable, and audited. Local development uses a `dev` provider with password login and a seeded admin; it is compiled out of production images.

## Alternatives considered

- **Own username/password store.** Rejected: one more credential system, no MFA, no offboarding sync.
- **Static API keys for agents.** Rejected: no scope, no expiry.
- **Per-company access lists.** Deferred: company access is by role for v1 (any authenticated role can read any company); an optional company allow-list is a v1.5 admin feature, already modeled in `mcp_tokens.scope`.

## Consequences

- Offboarding is automatic with Entra group removal.
- Validators never see drafts; the service layer filters by `published`, not the UI.
- Every mutating verb and every run is written to `audit_log` with actor, role, scope.

## How we verify

Authorization tests enumerate every service verb × role and assert the allow/deny matrix from a checked-in table. A test mints an `agent` token scoped to one tenant and asserts a run on another tenant is refused. The `dev` provider is asserted absent from the production build artifact.
