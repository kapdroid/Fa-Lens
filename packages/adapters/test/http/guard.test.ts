// The refusals, one row per way a url can try to be something it is not.
import { describe, expect, test } from 'vitest';
import { refuse } from '../../src/index.ts';
import { server, step } from './fixtures.ts';

const BASE = 'https://app-api-mars.fieldassist.example';
const src = server(BASE);

describe('refuse', () => {
  const cases: [string, string, string | undefined][] = [
    ['the catalog url itself', `${BASE}/check/login`, undefined],
    ['a different host', 'https://evil.example/steal', 'BLOCKED · host not in the catalog'],
    ['the allowed host over plain http', `${BASE.replace('https', 'http')}/check/login`, 'BLOCKED · host not in the catalog'],
    ['another scheme entirely', `ftp://app-api-mars.fieldassist.example/x`, 'BLOCKED · host not in the catalog'],
    ['the allowed host on another port', 'https://app-api-mars.fieldassist.example:8443/x', 'BLOCKED · host not in the catalog'],
    ['the allowed host as userinfo on an attacker host', 'https://app-api-mars.fieldassist.example@evil.example/x', 'BLOCKED · host not in the catalog'],
    ['credentials in front of the allowed host', 'https://user:pass@app-api-mars.fieldassist.example/x', 'BLOCKED · credentials in the url'],
    ['the host in capitals', 'https://APP-API-MARS.fieldassist.example/x', undefined],
    ['a trailing dot on the host', 'https://app-api-mars.fieldassist.example./x', 'BLOCKED · host not in the catalog'],
    ['something that is not a url', 'not a url', 'BLOCKED · not a usable url'],
  ];
  for (const [name, url, verdict] of cases) {
    test(name, () => { expect(refuse(step(src, { url }), { allowInsecureLoopback: true })?.verdict).toBe(verdict); });
  }

  test('a method the catalog does not list', () => {
    expect(refuse(step(src, { method: 'POST' }))?.verdict).toBe('BLOCKED · method not allowed');
  });

  test('a writing method the catalog does list is still refused unless the source is the sandbox', () => {
    const writable = server('https://app-api-mars.fieldassist.example', { methods: ['GET', 'POST'] });
    expect(refuse(step(writable, { method: 'POST' }))?.verdict).toBe('BLOCKED · writing method outside a sandbox source');
    const sandbox = server('https://app-api-mars.fieldassist.example', { methods: ['GET', 'POST'], sandbox: true });
    expect(refuse(step(sandbox, { method: 'POST' }))).toBeUndefined();
  });

  test('plain http on loopback is refused unless a caller asks for that allowance', () => {
    const local = server('http://127.0.0.1:8080');
    expect(refuse(step(local, { url: 'http://127.0.0.1:8080/x' }))?.verdict).toBe('BLOCKED · not https');
  });

  test('loopback over plain http is allowed, because that is how a test reaches a local server', () => {
    const local = server('http://127.0.0.1:8080');
    expect(refuse(step(local, { url: 'http://127.0.0.1:8080/x' }), { allowInsecureLoopback: true })).toBeUndefined();
  });
});
