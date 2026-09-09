// Run coalescing (ADR-0016): the advisory lock is a short mutual-exclusion gate around the
// check-and-insert; the durable state is the runs row. Nothing holds a connection between requests,
// and a crashed worker leaves a row to sweep rather than a lock to reclaim.
import type { Pool } from 'pg';

export interface Acquired {
  /** True when an equivalent run was already in flight and this caller joined it. */
  joined: boolean;
  runId: string;
}

export interface Lock {
  acquire: (scopeHash: string, createRun: () => Promise<string>) => Promise<Acquired>;
  lockKey: (scopeHash: string) => bigint;
}

/** A 64-bit advisory key from the scope hash. A collision costs a moment of serialisation, never a wrong answer:
 *  the run row is read inside the gate, so two different scopes that collide still see their own rows. */
export function lockKey(scopeHash: string): bigint {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < scopeHash.length; i++) {
    hash ^= BigInt(scopeHash.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return BigInt.asIntN(64, hash);
}

const ACTIVE = ['queued', 'running'];

export function runLock(pool: Pool): Lock {
  return {
    lockKey,
    async acquire(scopeHash, createRun) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Released by the commit below; see ADR-0016 for why this is not held for the run's lifetime.
        await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey(scopeHash).toString()]);
        const { rows } = await client.query<{ id: string }>(
          'SELECT id FROM runs WHERE scope_hash = $1 AND status = ANY($2) ORDER BY created_at LIMIT 1',
          [scopeHash, ACTIVE],
        );
        const existing = rows[0]?.id;
        if (existing) {
          await client.query('COMMIT');
          return { joined: true, runId: existing };
        }
        const runId = await createRun();
        await client.query('COMMIT');
        return { joined: false, runId };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
