import { and, eq, sql } from 'drizzle-orm';
import type { Pool } from 'pg';
import { evidenceRows } from '../schema/index.ts';
import { controlDb } from './db.ts';
import { requireCompany } from './tenant.ts';

/** The partition a timestamp belongs to. Evidence expires by dropping one of these (architecture §6). */
export function monthPartitionName(when: Date): string {
  return `evidence_rows_${when.getUTCFullYear()}_${String(when.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface NewEvidence {
  runId: string;
  bucketKey: string;
  payload: unknown;
}

const THIRTY_DAYS_MS = 30 * 86400000;

export function evidenceRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'evidenceRepo');
  const db = controlDb(pool);
  return {
    /** Create the partition for a month if it is not there yet; months beyond the migration's two arrive this way. */
    async ensurePartition(when: Date): Promise<string> {
      const name = monthPartitionName(when);
      const from = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), 1)).toISOString().slice(0, 10);
      const to = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
      // DDL: partition attachment is not expressible in the query builder.
      await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${name} PARTITION OF evidence_rows FOR VALUES FROM ('${from}') TO ('${to}')`));
      return name;
    },
    async add(e: NewEvidence): Promise<{ id: string }> {
      const now = new Date();
      const [row] = await db.insert(evidenceRows).values({
        companyId: company, runId: e.runId, bucketKey: e.bucketKey, payload: e.payload,
        createdAt: now, expiresAt: new Date(now.getTime() + THIRTY_DAYS_MS),
      }).returning({ id: evidenceRows.id });
      if (!row) throw new Error('evidenceRepo.add inserted no row');
      return row;
    },
    async forRun(runId: string, limit = 500) {
      return db.select({ id: evidenceRows.id, bucketKey: evidenceRows.bucketKey, payload: evidenceRows.payload })
        .from(evidenceRows).where(and(eq(evidenceRows.companyId, company), eq(evidenceRows.runId, runId))).limit(limit);
    },
  };
}
