// Thin wiring from the control plane onto the ports. Nothing here decides anything; the use-cases do.
import { runLock, runsRepo, verdictsRepo } from '@falens/control';
import type { Deps, FlowRecord, ModuleRecord, QueuePort } from './ports.ts';

/** The control plane's own pool type, taken from its signature rather than by importing a driver here. */
export type ControlPool = Parameters<typeof runsRepo>[0];

export interface BindOptions {
  pool: ControlPool;
  companyId: string;
  queue: QueuePort;
  /** Until the registry unit lands, the installed modules and their flows are supplied by the caller. */
  modules?: ModuleRecord[];
  flows?: Record<string, FlowRecord[]>;
}

export function bindDeps(options: BindOptions): Deps {
  const runs = runsRepo(options.pool, options.companyId);
  const verdicts = verdictsRepo(options.pool, options.companyId);
  const lock = runLock(options.pool);
  const modules = options.modules ?? [];
  const flows = options.flows ?? {};
  return {
    companyId: options.companyId,
    runs: {
      byId: async id => {
        const row = await runs.byId(id);
        return row ? { ...row, createdAt: row.createdAt ?? new Date() } : undefined;
      },
      recent: async limit => (await runs.recent(limit)).map(row => ({ ...row, createdAt: row.createdAt ?? new Date() })),
    },
    lock: { acquire: (scopeHash, createRun) => lock.acquire(scopeHash, createRun) },
    queue: options.queue,
    verdicts: { matrix: () => verdicts.matrix() },
    modules: {
      list: async () => modules,
      flows: async moduleId => flows[moduleId] ?? [],
    },
  };
}
