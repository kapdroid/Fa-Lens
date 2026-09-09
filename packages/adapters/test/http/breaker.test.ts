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

test('a step that queued while the source was healthy does not reach it once the breaker has opened', async () => {
  const hung = await startTestServer({ delayMs: 250, failFirst: 100 });
  try {
    const adapter = httpAdapter({ isolate: true });
    const src = server(hung.origin, { server: 'app-api-hung', budget: { concurrency: 2, timeoutMs: 2000, failuresToOpen: 2, cooldownMs: 60_000 } });
    const results = await Promise.all(Array.from({ length: 20 }, () => first(adapter.execute(step(src), {}))));
    expect(results.filter(r => r.verdict === 'source down').length).toBeGreaterThan(0);
    // Without the second check under the permit, every one of the twenty would have reached the source.
    expect(hung.requests.length).toBeLessThan(20);
  } finally { await hung.close(); }
}, 30_000);

test('a trial that fails puts the breaker back to open rather than probing on every call', async () => {
  const down = await startTestServer({ failFirst: 100 });
  try {
    const adapter = httpAdapter({ isolate: true });
    const src = server(down.origin, { server: 'app-api-down', budget: { concurrency: 2, timeoutMs: 500, failuresToOpen: 2, cooldownMs: 200 } });
    for (let i = 0; i < 2; i++) await first(adapter.execute(step(src), {}));
    await new Promise(resolve => setTimeout(resolve, 250));
    const before = down.requests.length;
    await first(adapter.execute(step(src), {}));      // the one trial
    const refusedAgain = await first(adapter.execute(step(src), {}));
    expect(refusedAgain.verdict).toBe('source down');
    expect(down.requests.length).toBe(before + 1);
  } finally { await down.close(); }
}, 20_000);

test('a redirect is refused rather than followed, whatever a global dispatcher might do', async () => {
  const redirecting = await startTestServer({ status: 302, body: () => '' });
  try {
    const adapter = httpAdapter({ isolate: true });
    const src = server(redirecting.origin, { server: 'app-api-redirect' });
    const chunk = await first(adapter.execute(step(src), {}));
    expect(chunk.kind).toBe('error');
    expect(chunk.verdict).toBe('redirect refused');
  } finally { await redirecting.close(); }
});
