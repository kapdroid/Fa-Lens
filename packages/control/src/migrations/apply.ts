// A migration is a .sql file applied once, in name order, inside a transaction. Applied names are
// recorded so a second run is a no-op; there is no down migration, because a change is a new file.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const here = dirname(fileURLToPath(import.meta.url));

export function migrationFiles(dir: string = here): string[] {
  return readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
}

/** Apply every migration the database has not seen. Returns the names applied by this call. */
export async function applyMigrations(pool: Pool, dir: string = here): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM _migrations');
  const done = new Set(rows.map(r => r.name));
  const applied: string[] = [];
  for (const name of migrationFiles(dir)) {
    if (done.has(name)) continue;
    const sql = readFileSync(join(dir, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      applied.push(name);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`migration ${name} failed: ${(e as Error).message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}
