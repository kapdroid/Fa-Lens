import { expect, test } from 'vitest';
import { call } from '../src/index.ts';
import { fakeDeps, scope } from './fakes.ts';

test('an input the schema forbids comes back as a problem naming the field, not as a throw', async () => {
  const result = await call('get_matrix', { scope: { ...scope, company: '' } }, fakeDeps());
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a problem');
  expect(result.problem.code).toBe('invalid_input');
  expect(result.problem.field).toContain('company');
});

test('a verb nobody declared is a problem, not a crash', async () => {
  const result = await call('drop_everything', {}, fakeDeps());
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a problem');
  expect(result.problem.code).toBe('unknown_verb');
  expect(result.problem.message).toContain('drop_everything');
});

test('a handler that returns the wrong shape is caught here rather than reaching a skin', async () => {
  const deps = fakeDeps();
  const broken = { ...deps, modules: { ...deps.modules, list: async () => [{ id: 'van' } as never] } };
  const result = await call('list_modules', { scope }, broken);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a problem');
  expect(result.problem.code).toBe('invalid_output');
});

test('a handler that fails says so in words a person can act on', async () => {
  const deps = fakeDeps();
  const broken = { ...deps, verdicts: { async matrix() { throw new Error('the ledger is unreachable'); } } };
  const result = await call('get_matrix', { scope }, broken);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a problem');
  expect(result.problem.code).toBe('failed');
  expect(result.problem.message).toContain('the ledger is unreachable');
});

test('a good call returns the parsed output', async () => {
  const result = await call('list_modules', { scope }, fakeDeps());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected a value');
  expect(result.value.modules.map(m => m.id)).toEqual(['van', 'jp', 'out']);
});
