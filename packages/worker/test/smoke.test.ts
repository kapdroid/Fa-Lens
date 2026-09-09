import { expect, test } from 'vitest';
import { PACKAGE } from '../src/index.ts';

test('worker package is wired into the workspace', () => {
  expect(PACKAGE).toBe('@falens/worker');
});
