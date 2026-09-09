// Two projects: fast unit tests everywhere, and integration tests that start containers.
// `pnpm test` runs the unit project; `pnpm test:integration` runs the integration one (Docker required).
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  { test: { name: 'unit', include: ['packages/*/test/**/*.test.ts'], exclude: ['**/test/integration/**'] } },
  { test: { name: 'integration', include: ['packages/*/test/integration/**/*.test.ts'], testTimeout: 120_000, hookTimeout: 120_000 } },
]);
