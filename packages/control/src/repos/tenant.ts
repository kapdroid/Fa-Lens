// Tenant isolation by construction: a repository over a company-scoped table cannot be built without a
// company id, and every statement it issues carries that id (docs/architecture.md §5).
export class TenantScopeMissing extends Error {
  constructor(what: string) {
    super(`${what} needs a company id: company-scoped rows are never read or written without one`);
    this.name = 'TenantScopeMissing';
  }
}

/** Return the company id, or refuse. Call this before building any company-scoped repository. */
export function requireCompany(companyId: string | undefined | null, what: string): string {
  if (typeof companyId !== 'string' || companyId.trim() === '') throw new TenantScopeMissing(what);
  return companyId;
}
