// Server cache (ADR-0004): the UNLOGGED cache_entries table is the shared truth across replicas, with a
// small in-process front for repeat reads. Losing either on a crash costs a recomputation, nothing more.
import type { Pool } from 'pg';

export interface Cache {
  get: <T>(key: string) => Promise<T | undefined>;
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

interface Held { value: unknown; expiresAt: number }

export function pgCache(pool: Pool): Cache {
  const front = new Map<string, Held>();
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const held = front.get(key);
      if (held) {
        if (held.expiresAt > Date.now()) return held.value as T;
        front.delete(key);
      }
      // expires_at is checked in the read, so an expired row is a miss before any sweeper runs.
      const { rows } = await pool.query<{ value: unknown; expires_at: Date }>(
        'SELECT value, expires_at FROM cache_entries WHERE key = $1 AND expires_at > now()', [key],
      );
      const row = rows[0];
      if (!row) return undefined;
      front.set(key, { value: row.value, expiresAt: row.expires_at.getTime() });
      return row.value as T;
    },
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await pool.query(
        `INSERT INTO cache_entries (key, value, expires_at) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
        [key, JSON.stringify(value), expiresAt],
      );
      front.set(key, { value, expiresAt: expiresAt.getTime() });
    },
    async delete(key: string): Promise<void> {
      front.delete(key);
      await pool.query('DELETE FROM cache_entries WHERE key = $1', [key]);
    },
  };
}
