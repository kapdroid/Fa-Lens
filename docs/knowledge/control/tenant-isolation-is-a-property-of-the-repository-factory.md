# Tenant isolation is a property of the repository factory, not of the caller

Rule: a company-scoped repository cannot be constructed without a `company_id` — the guard (`scoped(companyId)`, throwing `TenantScopeMissing`) sits in front of every company-scoped read and write, not inside individual query methods a caller might forget to check. A read for another company's row returns nothing (an empty result), never an error, so a caller who queries the wrong `company_id` never learns the row exists at all.

Why it matters: this shapes what the tests must assert. `tenant-scope.test.ts` proves the guard by calling the repository factory with no `company_id` and expecting the throw at construction time, not by calling a read/write method and expecting a runtime check inside it. It also means "does isolation work" cannot be verified by asserting an error on cross-tenant access — the correct assertion is an empty read, since a wrong-tenant query is indistinguishable from a nonexistent row by design.

Source: U-010, 2026-09-09.
