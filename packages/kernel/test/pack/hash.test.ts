import { expect, test } from 'vitest';
import { hashPack, parsePack } from '../../src/index.ts';
import { validPack } from './fixtures.ts';

test('hashPack is stable for the same content parsed twice', async () => {
  const a = await hashPack(parsePack(validPack()).pack);
  const b = await hashPack(parsePack(validPack()).pack);
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});

test('hashPack changes when one byte of a flow changes', async () => {
  const files = validPack();
  const changed = { ...files, 'flows/day-cycle.yaml': files['flows/day-cycle.yaml']!.replace('seconds: 2', 'seconds: 3') };
  expect(await hashPack(parsePack(changed).pack)).not.toBe(await hashPack(parsePack(files).pack));
});

test('hashPack ignores key order in YAML documents', async () => {
  const files = validPack();
  const reordered = { ...files, 'cases/day-begin.yaml': 'kind: happy\nid: day-begin.happy\nendpoint: POST day/begin\nexpect:\n  status: 200\n' };
  expect(await hashPack(parsePack(reordered).pack)).toBe(await hashPack(parsePack(files).pack));
});
