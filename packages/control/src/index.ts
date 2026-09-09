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

export { lockKey, runLock } from './lock/lock.ts';
export type { Acquired, Lock, TxClient } from './lock/lock.ts';
export { MAX_PAYLOAD_BYTES, pgBus } from './bus/bus.ts';
export type { Bus } from './bus/bus.ts';
export { DEFAULT_EXPIRE_SECONDS, DEFAULT_RETRY_DELAY_SECONDS, DEFAULT_RETRY_LIMIT, pgQueue } from './queue/queue.ts';
export type { Job, Queue, QueueStarter, SendOptions, WorkOptions } from './queue/queue.ts';
export { pgCache } from './cache/cache.ts';
export type { Cache } from './cache/cache.ts';
