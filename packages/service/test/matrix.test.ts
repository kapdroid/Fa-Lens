import { expect, test } from 'vitest';
import { call } from '../src/index.ts';
import { fakeDeps, scope } from './fakes.ts';

test('the matrix folds each module to the worst of its testing types', async () => {
  const result = await call('get_matrix', { scope }, fakeDeps());
  if (!result.ok) throw new Error('expected a value');
  const van = result.value.modules.find(m => m.module === 'van');
  expect(van?.severity).toBe('fail');
  expect(van?.types).toEqual([{ testingType: 'apis', severity: 'ok' }, { testingType: 'validations', severity: 'fail' }]);
  expect(result.value.modules.find(m => m.module === 'jp')?.severity).toBe('warn');
});

test('the company reads as the worst of its modules', async () => {
  const result = await call('get_matrix', { scope }, fakeDeps());
  if (!result.ok) throw new Error('expected a value');
  expect(result.value.severity).toBe('fail');
  expect(result.value.counts.fail).toBe(1);
});

test('a module that has never run reads as none, not as a failure', async () => {
  const result = await call('get_matrix', { scope }, fakeDeps());
  if (!result.ok) throw new Error('expected a value');
  const untouched = result.value.modules.find(m => m.module === 'out');
  expect(untouched?.severity).toBe('none');
  expect(untouched?.types).toEqual([]);
});
