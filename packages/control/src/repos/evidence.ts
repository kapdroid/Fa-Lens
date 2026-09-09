import type { Pool } from 'pg';
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

export function evidenceRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'evidenceRepo');
  return {
    /** Create the partition for a month if it is not there yet; months beyond the migration's two arrive this way. */
    async ensurePartition(when: Date): Promise<string> {
      const name = monthPartitionName(when);
      const from = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), 1)).toISOString().slice(0, 10);
      const to = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
      await pool.query(`CREATE TABLE IF NOT EXISTS ${name} PARTITION OF evidence_rows FOR VALUES FROM ('${from}') TO ('${to}')`);
      return name;
    },
    async add(e: NewEvidence): Promise<{ id: string }> {
      const { rows } = await pool.query(
        'INSERT INTO evidence_rows (company_id, run_id, bucket_key, payload) VALUES ($1,$2,$3,$4) RETURNING id',
        [company, e.runId, e.bucketKey, JSON.stringify(e.payload)],
      );
      return { id: String((rows[0] as Record<string, unknown>)['id']) };
    },
    async forRun(runId: string, limit = 500): Promise<{ id: string; bucketKey: string; payload: unknown }[]> {
      const { rows } = await pool.query('SELECT id, bucket_key, payload FROM evidence_rows WHERE company_id = $1 AND run_id = $2 LIMIT $3', [company, runId, limit]);
      return rows.map(r => ({ id: String((r as Record<string, unknown>)['id']), bucketKey: String((r as Record<string, unknown>)['bucket_key']), payload: (r as Record<string, unknown>)['payload'] }));
    },
  };
}
