import { afterAll, beforeAll, expect, test } from 'vitest';
import { httpAdapter } from '../../src/index.ts';
import type { LogLine } from '../../src/index.ts';
import type { TestServer } from './server.ts';
import { startTestServer } from './server.ts';
import { first, server, step } from './fixtures.ts';

let s: TestServer;
beforeAll(async () => { s = await startTestServer({ body: () => JSON.stringify({ secretValue: 'nuclear-codes', rows: [{ name: 'Kapil' }] }) }); });
afterAll(async () => { await s?.close(); });

test('the log line is a fingerprint: what was asked, of whom, how much and how long', async () => {
  const lines: LogLine[] = [];
  const adapter = httpAdapter();
  const src = server(s.origin, { credential: 'vault://app-api-agent-token' });
  await first(adapter.execute(step(src, { headers: { Authorization: 'Bearer super-secret-token' } }), { log: line => lines.push(line), runId: 'run-1' }));
  expect(lines).toHaveLength(1);
  const line = lines[0]!;
  expect(line).toMatchObject({ stepId: 'login', server: 'app-api-mars', method: 'GET', status: 200, runId: 'run-1' });
  expect(typeof line.durationMs).toBe('number');
  expect(typeof line.rowsLookedAt).toBe('number');
});

test('no credential, header or body value can reach the log, whatever the response says', async () => {
  const lines: LogLine[] = [];
  const adapter = httpAdapter();
  const src = server(s.origin, { credential: 'vault://app-api-agent-token' });
  await first(adapter.execute(step(src, { headers: { Authorization: 'Bearer super-secret-token' } }), { log: line => lines.push(line) }));
  const text = JSON.stringify(lines);
  expect(text).not.toContain('super-secret-token');
  expect(text).not.toContain('vault://');
  expect(text).not.toContain('nuclear-codes');
  expect(text).not.toContain('Kapil');
  expect(text).not.toContain('Authorization');
});

test('a blocked call is logged too, so a refusal is never silent', async () => {
  const lines: LogLine[] = [];
  const adapter = httpAdapter({ request: async () => { throw new Error('never'); } });
  await first(adapter.execute(step(server(s.origin), { url: 'https://evil.example/x' }), { log: line => lines.push(line) }));
  expect(lines[0]?.verdict).toBe('BLOCKED · host not in the catalog');
  expect(lines[0]?.host).toBe('evil.example');
});

test('an error verdict says what happened in fixed words, never echoing a url or its query', async () => {
  const lines: LogLine[] = [];
  const adapter = httpAdapter({
    isolate: true,
    request: async (url: string) => { throw new Error(`connect ECONNREFUSED while fetching ${url}`); },
  });
  const src = server(s.origin);
  const chunk = await first(adapter.execute(step(src, { url: `${s.origin}/check/login?token=super-secret-token` }), { log: line => lines.push(line) }));
  expect(chunk.verdict).toBe('the source refused the connection');
  expect(JSON.stringify(lines)).not.toContain('super-secret-token');
});

test('an override header cannot turn an allowed GET into a write', async () => {
  const seen = await startTestServer();
  try {
    const adapter = httpAdapter({ isolate: true });
    await first(adapter.execute(step(server(seen.origin), { headers: { 'X-HTTP-Method-Override': 'DELETE' } }), {}));
    expect(seen.requests[0]?.method).toBe('GET');
  } finally { await seen.close(); }
});
