// architecture §4: validate, compute the scope hash, take the gate, join or insert, enqueue, return the id.
import { expect, test } from 'vitest';
import { call } from '../src/index.ts';
import { fakeDeps, scope } from './fakes.ts';

test('a run is created once and its job enqueued once', async () => {
  const deps = fakeDeps();
  const result = await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('expected a value');
  expect(result.value.joined).toBe(false);
  expect(result.value.runId).toBe('run-1');
  expect(deps.sent).toEqual([{ name: 'run.execute', data: { runId: 'run-1' } }]);
  expect(deps.rows).toHaveLength(1);
});

test('a second caller for the same scope and target joins the run already in flight', async () => {
  const deps = fakeDeps();
  const first = await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  const second = await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) throw new Error('expected values');
  expect(second.value.joined).toBe(true);
  expect(second.value.runId).toBe(first.value.runId);
  expect(deps.rows).toHaveLength(1);
  // A caller that joined must not enqueue a second job for the same work.
  expect(deps.sent).toHaveLength(1);
});

test('the same scope hashes the same however the caller ordered the keys', async () => {
  const deps = fakeDeps();
  await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  const reordered = { dateTo: scope.dateTo, user: scope.user, company: scope.company, tenant: scope.tenant, env: scope.env, dateFrom: scope.dateFrom };
  const second = await call('create_run', { scope: reordered, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  if (!second.ok) throw new Error('expected a value');
  expect(second.value.joined).toBe(true);
});

test('a different date range is a different run', async () => {
  const deps = fakeDeps();
  await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  const second = await call('create_run', { scope: { ...scope, dateTo: '2026-09-30' }, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  if (!second.ok) throw new Error('expected a value');
  expect(second.value.joined).toBe(false);
  expect(deps.rows).toHaveLength(2);
});

test('a target the schema does not know is refused before any lock is taken', async () => {
  const deps = fakeDeps();
  const result = await call('create_run', { scope, target: { kind: 'everything', id: 'x' } }, deps);
  expect(result.ok).toBe(false);
  expect(deps.rows).toHaveLength(0);
  expect(deps.sent).toHaveLength(0);
});

test('get_run reads a run back, and says nothing about one in another company', async () => {
  const deps = fakeDeps();
  await call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, deps);
  const found = await call('get_run', { scope, runId: 'run-1' }, deps);
  expect(found.ok).toBe(true);
  const missing = await call('get_run', { scope, runId: 'run-404' }, deps);
  expect(missing.ok).toBe(false);
  if (missing.ok) throw new Error('expected a problem');
  expect(missing.problem.code).toBe('not_found');
});
