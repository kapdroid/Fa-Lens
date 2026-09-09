import { expect, test } from 'vitest';
import { PACKAGE } from '../src/index.ts';

test('control package is wired into the workspace', () => {
  expect(PACKAGE).toBe('@falens/control');
});
