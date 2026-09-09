// Postgres control plane: schema, migrations, and tenant-scoped repositories (ADR-0004).
export const PACKAGE = '@falens/control' as const;

export * as schema from './schema/index.ts';
export { COMPANY_SCOPED, TABLES } from './schema/index.ts';
export { applyMigrations, migrationFiles } from './migrations/apply.ts';
export { controlDb, controlPool } from './repos/db.ts';
export type { ControlDb } from './repos/db.ts';
export { TenantScopeMissing, requireCompany } from './repos/tenant.ts';
export { runsRepo } from './repos/runs.ts';
export type { NewRun, RunRow } from './repos/runs.ts';
export { verdictsRepo } from './repos/verdicts.ts';
export type { MatrixCell, NewVerdict } from './repos/verdicts.ts';
export { evidenceRepo, monthPartitionName } from './repos/evidence.ts';
export type { NewEvidence } from './repos/evidence.ts';
