import { expect, test } from 'vitest';
import { PACKAGE } from '../src/index.ts';

test('kernel package is wired into the workspace', () => {
  expect(PACKAGE).toBe('@falens/kernel');
});
