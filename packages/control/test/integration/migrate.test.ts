import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { applyMigrations } from '../../src/migrations/apply.ts';
import { TABLES } from '../../src/schema/index.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane({ migrate: false }); });
afterAll(async () => { await h?.stop(); });

test('migrations apply from an empty database and create every table the schema declares', async () => {
  const applied = await applyMigrations(h.pool);
  expect(applied.length).toBeGreaterThan(0);
  const { rows } = await h.pool.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  const present = new Set(rows.map(r => r.table_name));
  for (const table of TABLES) expect(present.has(table), `${table} is declared in the schema but not created by a migration`).toBe(true);
});

test('running them a second time applies nothing and leaves the database as it was', async () => {
  const again = await applyMigrations(h.pool);
  expect(again).toEqual([]);
});

test('the audit log refuses an update or a delete, so history cannot be rewritten', async () => {
  await h.pool.query("INSERT INTO audit_log (company_id, actor, action, detail) VALUES ('234474', 'DSR-1', 'run.started', '{}'::jsonb)");
  await expect(h.pool.query("UPDATE audit_log SET action = 'tampered'")).rejects.toThrow(/append-only/i);
  await expect(h.pool.query('DELETE FROM audit_log')).rejects.toThrow(/append-only/i);
});

test('cache_entries is unlogged, because the cache may be lost on a crash without harm', async () => {
  const { rows } = await h.pool.query<{ relpersistence: string }>("SELECT relpersistence FROM pg_class WHERE relname = 'cache_entries'");
  expect(rows[0]?.relpersistence).toBe('u');
});
