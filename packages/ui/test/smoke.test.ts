import { expect, test } from 'vitest';
import { PACKAGE } from '../src/index.ts';

test('ui package is wired into the workspace', () => {
  expect(PACKAGE).toBe('@falens/ui');
});
