// One Postgres 16 container per test file, migrated and ready. Nothing here talks to a source database;
// this is FA Lens's own control plane (ADR-0004).
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { applyMigrations } from '../../src/migrations/apply.ts';

export interface Harness {
  pool: Pool;
  url: string;
  stop: () => Promise<void>;
}

export async function startControlPlane(options: { migrate?: boolean } = {}): Promise<Harness> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();
  const pool = new Pool({ connectionString: url });
  if (options.migrate !== false) await applyMigrations(pool);
  return {
    pool,
    url,
    stop: async () => { await pool.end(); await container.stop(); },
  };
}
