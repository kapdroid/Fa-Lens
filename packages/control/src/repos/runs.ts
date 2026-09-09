import type { Pool } from 'pg';
import { requireCompany } from './tenant.ts';

export interface RunRow {
  id: string;
  companyId: string;
  targetKind: string;
  targetId: string;
  scopeHash: string;
  status: string;
  createdAt: Date;
}

export interface NewRun {
  targetKind: 'flow' | 'module' | 'company' | 'suite';
  targetId: string;
  scopeHash: string;
}

const toRun = (r: Record<string, unknown>): RunRow => ({
  id: String(r['id']), companyId: String(r['company_id']), targetKind: String(r['target_kind']),
  targetId: String(r['target_id']), scopeHash: String(r['scope_hash']), status: String(r['status']),
  createdAt: r['created_at'] as Date,
});

export function runsRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'runsRepo');
  return {
    async create(run: NewRun): Promise<RunRow> {
      const { rows } = await pool.query(
        'INSERT INTO runs (company_id, target_kind, target_id, scope_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [company, run.targetKind, run.targetId, run.scopeHash],
      );
      return toRun(rows[0] as Record<string, unknown>);
    },
    /** Undefined when the run belongs to another company: a caller never learns it exists. */
    async byId(id: string): Promise<RunRow | undefined> {
      const { rows } = await pool.query('SELECT * FROM runs WHERE id = $1 AND company_id = $2', [id, company]);
      return rows[0] ? toRun(rows[0] as Record<string, unknown>) : undefined;
    },
    async recent(limit = 50): Promise<RunRow[]> {
      const { rows } = await pool.query('SELECT * FROM runs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2', [company, limit]);
      return rows.map(r => toRun(r as Record<string, unknown>));
    },
  };
}
