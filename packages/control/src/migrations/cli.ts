// `pnpm migrate` against DATABASE_URL, for a developer's local Postgres from docker-compose.yml.
import { Pool } from 'pg';
import { applyMigrations } from './apply.ts';

const url = process.env['DATABASE_URL'] ?? 'postgres://falens:falens@localhost:5432/falens';
const pool = new Pool({ connectionString: url });
try {
  const applied = await applyMigrations(pool);
  console.log(applied.length ? `migrate: applied ${applied.join(', ')}` : 'migrate: already up to date');
} catch (e) {
  console.error(`migrate: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
