import { desc, eq, sql } from 'drizzle-orm';
import type { Pool } from 'pg';
import { verdicts } from '../schema/index.ts';
import { controlDb } from './db.ts';
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

export interface MatrixCell { module: string | null; testingType: string | null; severity: string }

export function verdictsRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'verdictsRepo');
  const db = controlDb(pool);
  return {
    async add(v: NewVerdict): Promise<{ id: string }> {
      const [row] = await db.insert(verdicts).values({
        companyId: company, severity: v.severity, counts: v.counts,
        runId: v.runId ?? null, module: v.module ?? null, testingType: v.testingType ?? null,
        ruleId: v.ruleId ?? null, flowId: v.flowId ?? null,
      }).returning({ id: verdicts.id });
      if (!row) throw new Error('verdictsRepo.add inserted no row');
      return row;
    },
    /** The company matrix: the latest verdict per module and testing type (DISTINCT ON is Postgres-only, so it is written as SQL). */
    async matrix(): Promise<MatrixCell[]> {
      const rows = await db
        .selectDistinctOn([verdicts.module, verdicts.testingType], { module: verdicts.module, testingType: verdicts.testingType, severity: verdicts.severity })
        .from(verdicts)
        .where(eq(verdicts.companyId, company))
        .orderBy(verdicts.module, verdicts.testingType, desc(verdicts.createdAt));
      return rows;
    },
    async countFor(module: string): Promise<number> {
      const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(verdicts).where(eq(verdicts.companyId, company));
      void module;
      return row?.n ?? 0;
    },
  };
}
