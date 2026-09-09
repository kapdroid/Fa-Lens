// What a use-case needs from the world, named as small interfaces so it can be exercised without a
// database. `bindings.ts` maps the control plane onto them; the tests map fakes.
import type { Severity } from '@falens/kernel';

export interface RunRecord {
  id: string;
  companyId: string;
  targetKind: string;
  targetId: string;
  scopeHash: string;
  status: string;
  createdAt: Date;
}

/** The transaction the lock hands over. Deliberately the smallest thing that can insert a row. */
export interface TxLike {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

export interface RunsPort {
  byId: (id: string) => Promise<RunRecord | undefined>;
  recent: (limit?: number) => Promise<RunRecord[]>;
}

export interface LockPort {
  /** Joins an equivalent run in flight, or lets the caller insert one inside the gate (ADR-0016). */
  acquire: (scopeHash: string, createRun: (tx: TxLike) => Promise<string>) => Promise<{ joined: boolean; runId: string }>;
}

export interface QueuePort {
  send: (name: string, data: unknown) => Promise<string | null>;
}

export interface MatrixCellRecord {
  module: string | null;
  testingType: string | null;
  severity: string;
}

export interface VerdictsPort {
  matrix: () => Promise<MatrixCellRecord[]>;
}

export interface ModuleRecord { id: string; name: string; group: string }
export interface FlowRecord { id: string; name: string }

export interface ModulesPort {
  list: () => Promise<ModuleRecord[]>;
  flows: (moduleId: string) => Promise<FlowRecord[]>;
}

export interface Deps {
  runs: RunsPort;
  lock: LockPort;
  queue: QueuePort;
  verdicts: VerdictsPort;
  modules: ModulesPort;
}

export type { Severity };
