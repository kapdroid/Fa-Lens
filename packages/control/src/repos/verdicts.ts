import type { Pool } from 'pg';
import { requireCompany } from './tenant.ts';

export interface NewVerdict {
  runId?: string;
  module?: string;
  testingType?: string;
  ruleId?: string;
  flowId?: string;
  severity: 'none' | 'skipped' | 'ok' | 'warn' | 'error' | 'fail';
  counts: Record<string, number>;
}

export function verdictsRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'verdictsRepo');
  return {
    async add(v: NewVerdict): Promise<{ id: string }> {
      const { rows } = await pool.query(
        'INSERT INTO verdicts (company_id, run_id, module, testing_type, rule_id, flow_id, severity, counts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [company, v.runId ?? null, v.module ?? null, v.testingType ?? null, v.ruleId ?? null, v.flowId ?? null, v.severity, JSON.stringify(v.counts)],
      );
      return { id: String((rows[0] as Record<string, unknown>)['id']) };
    },
    /** The company matrix: the latest verdict per module and testing type. */
    async matrix(): Promise<{ module: string | null; testingType: string | null; severity: string }[]> {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (module, testing_type) module, testing_type, severity
         FROM verdicts WHERE company_id = $1 ORDER BY module, testing_type, created_at DESC`,
        [company],
      );
      return rows.map(r => ({ module: (r as Record<string, unknown>)['module'] as string | null, testingType: (r as Record<string, unknown>)['testing_type'] as string | null, severity: String((r as Record<string, unknown>)['severity']) }));
    },
  };
}
