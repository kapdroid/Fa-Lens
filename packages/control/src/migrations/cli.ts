// `pnpm migrate` against DATABASE_URL, for a developer's local Postgres from docker-compose.yml.
import { Pool } from 'pg';
import { applyMigrations } from './apply.ts';

const url = process.env['DATABASE_URL'] ?? 'postgres://falens:falens@localhost:5432/falens';
const pool = new Pool({ connectionString: url });

/** A container started a second ago is still opening its socket; wait rather than fail the command. */
async function waitForDatabase(attempts = 20, delayMs = 500): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try { await pool.query('SELECT 1'); return; } catch (e) {
      if (i === attempts) throw e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

try {
  await waitForDatabase();
  const applied = await applyMigrations(pool);
  console.log(applied.length ? `migrate: applied ${applied.join(', ')}` : 'migrate: already up to date');
} catch (e) {
  console.error(`migrate: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
