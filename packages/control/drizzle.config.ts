// Drizzle points at the schema for tooling; the .sql files under src/migrations are what actually run
// (they express partitioning, the append-only trigger, and the unlogged cache, which the generator cannot).
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
} satisfies Config;
