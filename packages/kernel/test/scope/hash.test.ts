import { expect, test } from 'vitest';
import { scopeHash } from '../../src/index.ts';
import type { Scope } from '../../src/index.ts';

const base: Scope = { env: 'beta', tenant: 'mars', company: '234474', user: 'DSR-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' };

test('the same scope written with keys in a different order hashes the same', async () => {
  const reordered = { dateTo: base.dateTo, user: base.user, company: base.company, tenant: base.tenant, env: base.env, dateFrom: base.dateFrom } as Scope;
  expect(await scopeHash(reordered)).toBe(await scopeHash(base));
  expect(await scopeHash(base)).toMatch(/^[0-9a-f]{64}$/);
});

test('a different date range hashes differently', async () => {
  expect(await scopeHash({ ...base, dateTo: '2026-09-30' })).not.toBe(await scopeHash(base));
});

test('a different company or env hashes differently', async () => {
  expect(await scopeHash({ ...base, company: '999999' })).not.toBe(await scopeHash(base));
  expect(await scopeHash({ ...base, env: 'prod' })).not.toBe(await scopeHash(base));
});

test('an unknown key is refused so the hash input set cannot drift', async () => {
  await expect(scopeHash({ ...base, region: 'apac' } as unknown as Scope)).rejects.toThrow(/region/);
});
