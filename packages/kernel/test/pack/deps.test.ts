// ADR-0015: the kernel may depend only on pure, I/O-free libraries from the explicit list.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const ALLOWED = ['ajv', 'ajv-formats', 'yaml', 'jsonpath-plus'];

test('packages/kernel/package.json declares only the ADR-0015 libraries', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { dependencies?: Record<string, string> };
  const deps = Object.keys(pkg.dependencies ?? {});
  expect(deps.filter(d => !ALLOWED.includes(d))).toEqual([]);
  expect(deps).toEqual(expect.arrayContaining(ALLOWED));
});
