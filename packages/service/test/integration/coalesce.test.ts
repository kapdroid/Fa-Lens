// The one behaviour only a real Postgres can prove: fifty callers asking for the same work at the same
// moment produce one run, and the other forty-nine are told which run they joined (ADR-0004, ADR-0016).
import { afterAll, beforeAll, expect, test } from 'vitest';
import { bindDeps, call } from '../../src/index.ts';
import type { Deps, QueuePort } from '../../src/index.ts';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';

let h: Harness;
const scope = { env: 'beta', tenant: 'mars', company: '234474', user: 'DSR-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' };

beforeAll(async () => { h = await startControlPlane(); });
afterAll(async () => { await h?.stop(); });

const deps = (sent: { name: string; data: unknown }[]): Deps => {
  const queue: QueuePort = { async send(name, data) { sent.push({ name, data }); return 'job'; } };
  return bindDeps({ pool: h.pool, companyId: scope.company, queue });
};

test('fifty callers racing for one scope produce one run and forty-nine joins', async () => {
  const sent: { name: string; data: unknown }[] = [];
  const d = deps(sent);
  const results = await Promise.all(Array.from({ length: 50 }, () => call('create_run', { scope, target: { kind: 'flow', id: 'app.day-cycle' } }, d)));

  const values = results.map(r => { if (!r.ok) throw new Error(r.problem.message); return r.value; });
  const created = values.filter(v => !v.joined);
  expect(created).toHaveLength(1);
  expect(values.filter(v => v.joined)).toHaveLength(49);
  for (const v of values) expect(v.runId).toBe(created[0]?.runId);

  const { rows } = await h.pool.query('SELECT COUNT(*) AS n FROM runs WHERE company_id = $1', [scope.company]);
  expect(rows[0]?.n).toBe('1');
  // Exactly one job for one piece of work: a caller that joined must not enqueue another.
  expect(sent).toHaveLength(1);
}, 60_000);

test('once the run leaves the queue the scope is free again', async () => {
  const sent: { name: string; data: unknown }[] = [];
  const d = deps(sent);
  const other = { ...scope, dateTo: '2026-07-31' };
  const first = await call('create_run', { scope: other, target: { kind: 'flow', id: 'app.day-cycle' } }, d);
  if (!first.ok) throw new Error('expected a value');
  await h.pool.query("UPDATE runs SET status = 'done' WHERE id = $1", [first.value.runId]);
  const second = await call('create_run', { scope: other, target: { kind: 'flow', id: 'app.day-cycle' } }, d);
  if (!second.ok) throw new Error('expected a value');
  expect(second.value.joined).toBe(false);
  expect(second.value.runId).not.toBe(first.value.runId);
});

test('two different targets in one scope share a run today, because the run key is the scope alone', async () => {
  const sent: { name: string; data: unknown }[] = [];
  const d = deps(sent);
  const other = { ...scope, dateTo: '2026-06-30' };
  const module = await call('create_run', { scope: other, target: { kind: 'module', id: 'van' } }, d);
  const flow = await call('create_run', { scope: other, target: { kind: 'flow', id: 'app.day-cycle' } }, d);
  if (!module.ok || !flow.ok) throw new Error('expected values');
  // Recorded rather than asserted as desirable: the coalescing key needs the target as well as the scope,
  // which is a follow-up on the kernel's scopeHash, not something this unit invents locally.
  expect(flow.value.joined).toBe(true);
});
