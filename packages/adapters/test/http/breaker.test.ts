import { afterAll, beforeAll, expect, test } from 'vitest';
import { httpAdapter } from '../../src/index.ts';
import type { TestServer } from './server.ts';
import { startTestServer } from './server.ts';
import { first, server, step } from './fixtures.ts';

let broken: TestServer;
beforeAll(async () => { broken = await startTestServer({ failFirst: 10, delayMs: 1 }); });
afterAll(async () => { await broken?.close(); });

const budget = { concurrency: 2, timeoutMs: 500, failuresToOpen: 3, cooldownMs: 300 };

test('the breaker opens after the configured failures and then refuses without calling the source', async () => {
  const adapter = httpAdapter();
  const src = server(broken.origin, { budget });
  for (let i = 0; i < 3; i++) await first(adapter.execute(step(src), {}));
  const before = broken.requests.length;
  const refused = await first(adapter.execute(step(src), {}));
  expect(refused.kind).toBe('error');
  expect(refused.verdict).toBe('source down');
  expect(broken.requests.length).toBe(before);
});

test('a source that is down does not stop another one', async () => {
  const healthy = await startTestServer();
  try {
    const adapter = httpAdapter();
    const down = server(broken.origin, { budget });
    for (let i = 0; i < 4; i++) await first(adapter.execute(step(down), {}));
    const other = server(healthy.origin, { server: 'app-api-colpal', budget });
    expect((await first(adapter.execute(step(other), {}))).kind).toBe('data');
  } finally { await healthy.close(); }
});

test('after the cooldown it half-opens, tries once, and closes when the source answers', async () => {
  const flaky = await startTestServer({ failFirst: 3 });
  try {
    const adapter = httpAdapter();
    const src = server(flaky.origin, { server: 'app-api-flaky', budget });
    for (let i = 0; i < 3; i++) await first(adapter.execute(step(src), {}));
    expect((await first(adapter.execute(step(src), {}))).verdict).toBe('source down');
    await new Promise(resolve => setTimeout(resolve, 350));
    const trial = await first(adapter.execute(step(src), {}));
    expect(trial.kind).toBe('data');
    expect((await first(adapter.execute(step(src), {}))).kind).toBe('data');
  } finally { await flaky.close(); }
}, 20_000);
