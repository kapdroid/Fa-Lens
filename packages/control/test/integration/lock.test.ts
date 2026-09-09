import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { runsRepo } from '../../src/index.ts';
import { runLock } from '../../src/lock/lock.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane(); });
afterAll(async () => { await h?.stop(); });

const newRun = (scopeHash: string) => async () => {
  const run = await runsRepo(h.pool, '234474').create({ targetKind: 'flow', targetId: 'app.day-cycle', scopeHash });
  return run.id;
};

test('two callers for one scope produce one run: the second joins the first', async () => {
  const lock = runLock(h.pool);
  const scopeHash = 'a'.repeat(64);
  const [first, second] = await Promise.all([lock.acquire(scopeHash, newRun(scopeHash)), lock.acquire(scopeHash, newRun(scopeHash))]);
  const joined = [first, second].filter(r => r.joined);
  const held = [first, second].filter(r => !r.joined);
  expect(held).toHaveLength(1);
  expect(joined).toHaveLength(1);
  expect(joined[0]?.runId).toBe(held[0]?.runId);
  const { rows } = await h.pool.query('SELECT COUNT(*) AS n FROM runs WHERE scope_hash = $1', [scopeHash]);
  expect(rows[0]?.n).toBe('1');
});

test('the scope frees once the run is no longer queued or running', async () => {
  const lock = runLock(h.pool);
  const scopeHash = 'b'.repeat(64);
  const first = await lock.acquire(scopeHash, newRun(scopeHash));
  await h.pool.query("UPDATE runs SET status = 'done' WHERE id = $1", [first.runId]);
  const second = await lock.acquire(scopeHash, newRun(scopeHash));
  expect(second.joined).toBe(false);
  expect(second.runId).not.toBe(first.runId);
});

test('a different scope is never blocked by the first', async () => {
  const lock = runLock(h.pool);
  const a = await lock.acquire('c'.repeat(64), newRun('c'.repeat(64)));
  const b = await lock.acquire('d'.repeat(64), newRun('d'.repeat(64)));
  expect(a.joined).toBe(false);
  expect(b.joined).toBe(false);
});

test('the lock is released by the transaction, so nothing is left held afterwards', async () => {
  const lock = runLock(h.pool);
  await lock.acquire('e'.repeat(64), newRun('e'.repeat(64)));
  const { rows } = await h.pool.query('SELECT COUNT(*) AS n FROM pg_locks WHERE locktype = $1', ['advisory']);
  expect(rows[0]?.n).toBe('0');
});
