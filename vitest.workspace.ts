// One unit project over every package's test folder. Integration (U-010) and e2e (web units) add their own projects.
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  { test: { name: 'unit', include: ['packages/*/test/**/*.test.ts'] } },
]);
