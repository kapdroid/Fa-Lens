import { afterAll, beforeAll, expect, test } from 'vitest';
import { httpAdapter } from '../../src/index.ts';
import type { TestServer } from './server.ts';
import { startTestServer } from './server.ts';
import { first, server, step } from './fixtures.ts';

let s: TestServer;
beforeAll(async () => { s = await startTestServer(); });
afterAll(async () => { await s?.close(); });

test('an allow-listed host answers with a chunk that says what it cost', async () => {
  const adapter = httpAdapter();
  const src = server(s.origin);
  const chunk = await first(adapter.execute(step(src), {}));
  expect(chunk.kind).toBe('data');
  expect(chunk.status).toBe(200);
  expect(chunk.server).toBe('app-api-mars');
  expect(chunk.rowsLookedAt).toBe(1);
  expect(chunk.truncated).toBe(false);
  expect(typeof chunk.durationMs).toBe('number');
});

test('a host the catalog does not name is blocked before a socket is opened', async () => {
  let calls = 0;
  const adapter = httpAdapter({ request: async () => { calls += 1; throw new Error('should never be called'); } });
  const src = server(s.origin);
  const chunk = await first(adapter.execute(step(src, { url: 'https://evil.example/steal' }), {}));
  expect(chunk.kind).toBe('blocked');
  expect(chunk.verdict).toBe('BLOCKED · host not in the catalog');
  expect(calls).toBe(0);
});

test('a method the source does not list is blocked the same way: this is the read-only guard for http', async () => {
  let calls = 0;
  const adapter = httpAdapter({ request: async () => { calls += 1; throw new Error('should never be called'); } });
  const src = server(s.origin);
  const chunk = await first(adapter.execute(step(src, { method: 'POST' }), {}));
  expect(chunk.kind).toBe('blocked');
  expect(chunk.verdict).toBe('BLOCKED · method not allowed');
  expect(calls).toBe(0);
});

test('probeReadOnly refuses a source that lists a writing method, and health answers on a live one', async () => {
  const adapter = httpAdapter();
  expect(await adapter.probeReadOnly(server(s.origin))).toMatchObject({ readOnly: true });
  const writable = await adapter.probeReadOnly(server(s.origin, { methods: ['GET', 'POST'] }));
  expect(writable.readOnly).toBe(false);
  expect(writable.reason).toMatch(/POST/);
  expect(await adapter.health(server(s.origin))).toMatchObject({ ok: true });
});
