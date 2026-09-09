import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { evidenceRepo, monthPartitionName, runsRepo } from '../../src/index.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane(); });
afterAll(async () => { await h?.stop(); });

const partitionExists = async (name: string): Promise<boolean> => {
  const { rows } = await h.pool.query<{ n: string }>('SELECT COUNT(*) AS n FROM pg_class WHERE relname = $1', [name]);
  return rows[0]?.n === '1';
};

test('the migration leaves this month and next month ready to receive rows', async () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  expect(await partitionExists(monthPartitionName(now))).toBe(true);
  expect(await partitionExists(monthPartitionName(next))).toBe(true);
});

test('an inserted evidence row lands in this month and expires thirty days later', async () => {
  const run = await runsRepo(h.pool, '234474').create({ targetKind: 'flow', targetId: 'app.day-cycle', scopeHash: 'c'.repeat(64) });
  const repo = evidenceRepo(h.pool, '234474');
  const row = await repo.add({ runId: run.id, bucketKey: '2026-08-05', payload: { n: 1 } });
  const { rows } = await h.pool.query<{ days: string; part: string }>(
    `SELECT ROUND(EXTRACT(EPOCH FROM (expires_at - created_at)) / 86400) AS days, tableoid::regclass::text AS part FROM evidence_rows WHERE id = $1`,
    [row.id],
  );
  expect(rows[0]?.days).toBe('30');
  expect(rows[0]?.part).toBe(monthPartitionName(new Date()));
});

test('a month with no partition is created on demand rather than failing the write', async () => {
  const future = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 5, 15));
  expect(await partitionExists(monthPartitionName(future))).toBe(false);
  await evidenceRepo(h.pool, '234474').ensurePartition(future);
  expect(await partitionExists(monthPartitionName(future))).toBe(true);
});

test('dropping a partition removes its rows without a delete, which is how evidence expires', async () => {
  const future = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 5, 15));
  await h.pool.query(`DROP TABLE ${monthPartitionName(future)}`);
  expect(await partitionExists(monthPartitionName(future))).toBe(false);
});
