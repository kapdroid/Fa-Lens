import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { pgQueue } from '../../src/queue/queue.ts';
import type { Queue } from '../../src/queue/queue.ts';

let h: Harness;
let queue: Queue;
beforeAll(async () => { h = await startControlPlane({ migrate: false }); queue = await pgQueue(h.url).start(); }, 120_000);
afterAll(async () => { await queue?.stop(); await h?.stop(); });

test('a job is delivered to its handler once', async () => {
  const seen: unknown[] = [];
  await queue.work('run.flow', async job => { seen.push(job.data); });
  await queue.send('run.flow', { runId: 'r1' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  expect(seen).toEqual([{ runId: 'r1' }]);
});

test('a job whose handler throws is delivered again, and a completed one is not', async () => {
  let attempts = 0;
  await queue.work('run.flaky', async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('worker died mid-window');
  });
  // Retry is a property of the job, so the sender chooses how soon a failure comes back.
  await queue.send('run.flaky', { runId: 'r2' }, { retryDelaySeconds: 1 });
  await new Promise(resolve => setTimeout(resolve, 6000));
  expect(attempts).toBeGreaterThanOrEqual(2);
  const before = attempts;
  await new Promise(resolve => setTimeout(resolve, 2000));
  expect(attempts).toBe(before);
}, 30_000);
