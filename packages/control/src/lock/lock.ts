// Run coalescing (ADR-0016): the advisory lock is a short mutual-exclusion gate around the
// check-and-insert; the durable state is the runs row. Nothing holds a connection between requests,
// and a crashed worker leaves a row to sweep rather than a lock to reclaim.
import type { Pool } from 'pg';

/** The narrow slice of a database client the caller needs; kept structural so the seam does not name a driver. */
export interface TxClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

export interface Acquired {
  /** True when an equivalent run was already in flight and this caller joined it. */
  joined: boolean;
  runId: string;
}

export interface Lock {
  /** `createRun` runs inside the same transaction that holds the gate, so the run row — and later its job —
   *  commit together with the decision to start it (ADR-0004, "transactional enqueue"). */
  acquire: (scopeHash: string, createRun: (tx: TxClient) => Promise<string>) => Promise<Acquired>;
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
        const runId = await createRun(client as unknown as TxClient);
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
