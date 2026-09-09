import { afterAll, beforeAll, expect, test } from 'vitest';
import { httpAdapter } from '../../src/index.ts';
import type { TestServer } from './server.ts';
import { startTestServer } from './server.ts';
import { first, server, step } from './fixtures.ts';

let slow: TestServer;
beforeAll(async () => { slow = await startTestServer({ delayMs: 40 }); });
afterAll(async () => { await slow?.close(); });

test('a hundred parallel steps never put more than the budget on the wire at once', async () => {
  const adapter = httpAdapter();
  const src = server(slow.origin, { budget: { concurrency: 4, timeoutMs: 5000 } });
  await Promise.all(Array.from({ length: 100 }, () => first(adapter.execute(step(src), {}))));
  expect(slow.peakInFlight).toBeLessThanOrEqual(4);
  expect(slow.requests).toHaveLength(100);
}, 30_000);

test('a response slower than the budget is an error chunk, not a thrown exception', async () => {
  const adapter = httpAdapter();
  const src = server(slow.origin, { budget: { concurrency: 4, timeoutMs: 10 } });
  const chunk = await first(adapter.execute(step(src), {}));
  expect(chunk.kind).toBe('error');
  expect(chunk.verdict).toMatch(/timed out/i);
  expect(chunk.durationMs).toBeGreaterThanOrEqual(0);
});

test('a body past the byte cap comes back truncated rather than whole', async () => {
  const big = await startTestServer({ body: () => JSON.stringify({ blob: 'x'.repeat(200_000) }) });
  try {
    const adapter = httpAdapter();
    const src = server(big.origin, { budget: { concurrency: 2, timeoutMs: 5000, maxBytes: 1000 } });
    const chunk = await first(adapter.execute(step(src), {}));
    expect(chunk.truncated).toBe(true);
    expect(chunk.kind).toBe('data');
  } finally { await big.close(); }
});

test('an array body past the row cap keeps the rows it read and says it was truncated', async () => {
  const many = await startTestServer({ body: () => JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ i }))) });
  try {
    const adapter = httpAdapter();
    const src = server(many.origin, { budget: { concurrency: 2, timeoutMs: 5000, maxRows: 10 } });
    const chunk = await first(adapter.execute(step(src), {}));
    expect(chunk.truncated).toBe(true);
    expect(chunk.rows).toHaveLength(10);
    expect(chunk.rowsLookedAt).toBe(10);
  } finally { await many.close(); }
});

test('an array under a data key is counted and capped, which is the shape a real api answers with', async () => {
  const wrapped = await startTestServer({ body: () => JSON.stringify({ data: Array.from({ length: 40 }, (_, i) => ({ i })) }) });
  try {
    const adapter = httpAdapter({ isolate: true });
    const src = server(wrapped.origin, { server: 'app-api-wrapped', budget: { concurrency: 2, timeoutMs: 5000, maxRows: 10 } });
    const chunk = await first(adapter.execute(step(src), {}));
    expect(chunk.rowsLookedAt).toBe(10);
    expect(chunk.truncated).toBe(true);
  } finally { await wrapped.close(); }
});

test('a caller that stops caring lets the source go, and the permit comes back', async () => {
  const slowish = await startTestServer({ delayMs: 300 });
  try {
    const adapter = httpAdapter({ isolate: true });
    const src = server(slowish.origin, { server: 'app-api-stop', budget: { concurrency: 1, timeoutMs: 5000 } });
    const controller = new AbortController();
    const pending = first(adapter.execute(step(src), { signal: controller.signal }));
    controller.abort();
    expect((await pending).verdict).toBe('stopped');
    const after = await first(adapter.execute(step(src), {}));
    expect(after.kind).toBe('data');
  } finally { await slowish.close(); }
}, 20_000);

test('a source with no usable budget is refused rather than given a default', async () => {
  const adapter = httpAdapter({ isolate: true });
  const src = server(slow.origin, { server: 'app-api-nobudget', budget: { concurrency: 0, timeoutMs: 0 } });
  const chunk = await first(adapter.execute(step(src), {}));
  expect(chunk.kind).toBe('blocked');
  expect(chunk.verdict).toMatch(/budget/);
});
