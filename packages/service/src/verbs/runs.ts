// create_run follows docs/architecture.md §4 in order: validate, compute the scope hash, take the gate,
// join or insert, enqueue only when it inserted, return the id.
import { scopeHash } from '@falens/kernel';
import { z } from 'zod';
import type { Deps, TxLike } from '../ports.ts';
import { scopeSchema, targetSchema } from '../schemas.ts';

export const RUN_JOB = 'run.execute';

export const createRun = {
  name: 'create_run',
  description: 'Start a run for a target in this scope, or join the equivalent run already in flight.',
  input: z.object({ scope: scopeSchema, target: targetSchema }),
  output: z.object({ runId: z.string(), joined: z.boolean() }),
  handler: async (input: { scope: z.infer<typeof scopeSchema>; target: z.infer<typeof targetSchema> }, deps: Deps) => {
    const hash = await scopeHash(input.scope);
    const { joined, runId } = await deps.lock.acquire(hash, async (tx: TxLike) => {
      // Inside the gate, on the gate's own transaction: the decision and the row commit together.
      const { rows } = await tx.query(
        'INSERT INTO runs (company_id, target_kind, target_id, scope_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [input.scope.company, input.target.kind, input.target.id, hash],
      );
      const id = rows[0]?.['id'];
      if (id === undefined) throw new Error('the run row was not written');
      return String(id);
    });
    // A caller that joined must not enqueue a second job for work already queued.
    if (!joined) await deps.queue.send(RUN_JOB, { runId });
    return { runId, joined };
  },
};

export const getRun = {
  name: 'get_run',
  description: 'One run in this company, with its status. A run in another company is simply not found.',
  input: z.object({ scope: scopeSchema, runId: z.string().min(1) }),
  output: z.object({ runId: z.string(), status: z.string(), targetKind: z.string(), targetId: z.string(), createdAt: z.string() }),
  handler: async (input: { runId: string }, deps: Deps) => {
    const run = await deps.runs.byId(input.runId);
    if (!run) return undefined;
    return { runId: run.id, status: run.status, targetKind: run.targetKind, targetId: run.targetId, createdAt: run.createdAt.toISOString() };
  },
};
