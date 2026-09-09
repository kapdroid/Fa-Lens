// A migrated Postgres 16 for the service's own integration tests. It lives here rather than being borrowed
// from the control package's tests, because a test that reached across would make the service a dependency
// of the layer below it (docs/architecture.md §2).
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { applyMigrations } from '@falens/control';
import { Pool } from 'pg';

export interface Harness { pool: Pool; url: string; stop: () => Promise<void> }

export async function startControlPlane(): Promise<Harness> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();
  const pool = new Pool({ connectionString: url });
  await applyMigrations(pool);
  return { pool, url, stop: async () => { await pool.end(); await container.stop(); } };
}
