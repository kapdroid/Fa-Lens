import { and, desc, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import { runs } from '../schema/index.ts';
import { controlDb } from './db.ts';
import { requireCompany } from './tenant.ts';

export type RunRow = typeof runs.$inferSelect;

export interface NewRun {
  targetKind: 'flow' | 'module' | 'company' | 'suite';
  targetId: string;
  scopeHash: string;
}

export function runsRepo(pool: Pool, companyId: string) {
  const company = requireCompany(companyId, 'runsRepo');
  const db = controlDb(pool);
  return {
    async create(run: NewRun): Promise<RunRow> {
      const [row] = await db.insert(runs).values({ companyId: company, ...run }).returning();
      if (!row) throw new Error('runsRepo.create inserted no row');
      return row;
    },
    /** Undefined when the run belongs to another company: a caller never learns it exists. */
    async byId(id: string): Promise<RunRow | undefined> {
      const [row] = await db.select().from(runs).where(and(eq(runs.id, id), eq(runs.companyId, company)));
      return row;
    },
    async recent(limit = 50): Promise<RunRow[]> {
      return db.select().from(runs).where(eq(runs.companyId, company)).orderBy(desc(runs.createdAt)).limit(limit);
    },
  };
}
