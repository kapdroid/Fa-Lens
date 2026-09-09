// One pool per process, wrapped by Drizzle (ADR-0004). The control plane is the only database FA Lens
// writes to; source databases are reached by adapters, from workers, read-only.
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema/index.ts';

export type ControlDb = NodePgDatabase<typeof schema>;

export function controlPool(connectionString: string = process.env['DATABASE_URL'] ?? 'postgres://falens:falens@localhost:5432/falens'): Pool {
  return new Pool({ connectionString, max: 10 });
}

export function controlDb(pool: Pool): ControlDb {
  return drizzle(pool, { schema });
}
