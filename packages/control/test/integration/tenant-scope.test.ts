import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { TenantScopeMissing, runsRepo } from '../../src/index.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane(); });
afterAll(async () => { await h?.stop(); });

test('a run row is written and read back inside its company', async () => {
  const repo = runsRepo(h.pool, '234474');
  const run = await repo.create({ targetKind: 'flow', targetId: 'app.day-cycle', scopeHash: 'a'.repeat(64) });
  const found = await repo.byId(run.id);
  expect(found?.companyId).toBe('234474');
  expect(found?.status).toBe('queued');
});

test('another company cannot read the first company\'s run', async () => {
  const mine = await runsRepo(h.pool, '234474').create({ targetKind: 'flow', targetId: 'app.day-cycle', scopeHash: 'b'.repeat(64) });
  expect(await runsRepo(h.pool, '999999').byId(mine.id)).toBeUndefined();
});

test('a repository built without a company id refuses to run a query', () => {
  expect(() => runsRepo(h.pool, '')).toThrow(TenantScopeMissing);
  expect(() => runsRepo(h.pool, undefined as unknown as string)).toThrow(/company/i);
});
