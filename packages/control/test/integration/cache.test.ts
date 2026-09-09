import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { pgCache } from '../../src/cache/cache.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane(); });
afterAll(async () => { await h?.stop(); });

test('a value is readable before its ttl and a miss after it', async () => {
  const cache = pgCache(h.pool);
  await cache.set('matrix:234474', { cells: 9 }, 1);
  expect(await cache.get('matrix:234474')).toEqual({ cells: 9 });
  await new Promise(resolve => setTimeout(resolve, 1200));
  expect(await cache.get('matrix:234474')).toBeUndefined();
});

test('a second process reads what the first wrote, so the table is the shared truth', async () => {
  const writer = pgCache(h.pool);
  const reader = pgCache(h.pool);
  await writer.set('shared', { ok: true }, 60);
  expect(await reader.get('shared')).toEqual({ ok: true });
});

test('an expired row is a miss even before anything sweeps it', async () => {
  const cache = pgCache(h.pool);
  await h.pool.query("INSERT INTO cache_entries (key, value, expires_at) VALUES ('stale', '{\"old\":true}'::jsonb, now() - interval '1 minute')");
  expect(await cache.get('stale')).toBeUndefined();
});

test('delete removes it from the table and from the memory front', async () => {
  const cache = pgCache(h.pool);
  await cache.set('gone', { a: 1 }, 60);
  await cache.delete('gone');
  expect(await cache.get('gone')).toBeUndefined();
  const { rows } = await h.pool.query('SELECT COUNT(*) AS n FROM cache_entries WHERE key = $1', ['gone']);
  expect(rows[0]?.n).toBe('0');
});
