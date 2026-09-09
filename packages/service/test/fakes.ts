// Fakes for the ports, so a use-case is exercised without a database. The one behaviour only a real
// Postgres can prove — fifty callers racing for one scope — is an integration test beside U-011's.
import type { Deps, LockPort, ModulesPort, QueuePort, RunRecord, RunsPort, VerdictsPort } from '../src/index.ts';

export function fakeDeps(over: Partial<Deps> = {}): Deps & { sent: { name: string; data: unknown }[]; rows: RunRecord[] } {
  const rows: RunRecord[] = [];
  const sent: { name: string; data: unknown }[] = [];

  const runs: RunsPort = {
    async byId(id) { return rows.find(r => r.id === id); },
    async recent() { return [...rows]; },
  };

  const lock: LockPort = {
    async acquire(scopeHash, createRun) {
      const active = rows.find(r => r.scopeHash === scopeHash && (r.status === 'queued' || r.status === 'running'));
      if (active) return { joined: true, runId: active.id };
      const runId = await createRun({
        async query(_sql, params) {
          const row: RunRecord = {
            id: `run-${rows.length + 1}`, companyId: String(params?.[0] ?? ''), targetKind: 'flow',
            targetId: String(params?.[1] ?? ''), scopeHash, status: 'queued', createdAt: new Date(),
          };
          rows.push(row);
          return { rows: [{ id: row.id }] };
        },
      });
      return { joined: false, runId };
    },
  };

  const queue: QueuePort = { async send(name, data) { sent.push({ name, data }); return `job-${sent.length}`; } };

  const verdicts: VerdictsPort = {
    async matrix() {
      return [
        { module: 'van', testingType: 'apis', severity: 'ok' },
        { module: 'van', testingType: 'validations', severity: 'fail' },
        { module: 'jp', testingType: 'apis', severity: 'warn' },
      ];
    },
  };

  const modules: ModulesPort = {
    async list() { return [{ id: 'van', name: 'Van Sales', group: 'Field app' }, { id: 'jp', name: 'Journey Plan', group: 'Field app' }, { id: 'out', name: 'Outlets', group: 'Field app' }]; },
    async flows(moduleId) { return moduleId === 'van' ? [{ id: 'app.day-cycle', name: 'App day cycle' }] : []; },
  };

  return { runs, lock, queue, verdicts, modules, ...over, sent, rows };
}

export const scope = { env: 'beta', tenant: 'mars', company: '234474', user: 'DSR-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' };
