// Jobs (ADR-0004): pg-boss on the same Postgres, so a run row and its job commit together.
// pg-boss owns its own schema and creates it on start.
import { PgBoss } from 'pg-boss';

/** Long enough for one windowed step, short enough that a crashed worker's job comes back promptly. */
export const DEFAULT_EXPIRE_SECONDS = 15 * 60;

/** A failed job comes back after this long unless the sender asks for something else. */
export const DEFAULT_RETRY_DELAY_SECONDS = 30;

export interface Job<T> { id: string; data: T }

/** Retry and expiry belong to the job, not to the worker that happens to pick it up. */
export interface SendOptions {
  retryLimit?: number;
  retryDelaySeconds?: number;
  expireInSeconds?: number;
}

export interface WorkOptions {
  pollingIntervalSeconds?: number;
}

export interface Queue {
  send: <T>(name: string, data: T, options?: SendOptions) => Promise<string | null>;
  work: <T>(name: string, options: WorkOptions | ((job: Job<T>) => Promise<void>), handler?: (job: Job<T>) => Promise<void>) => Promise<string>;
  stop: () => Promise<void>;
}

export interface QueueStarter { start: () => Promise<Queue> }

export function pgQueue(connectionString: string): QueueStarter {
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  return {
    async start() {
      await boss.start();
      const queues = new Set<string>();
      const ensureQueue = async (name: string): Promise<void> => {
        if (queues.has(name)) return;
        try { await boss.createQueue(name); } catch { /* already there */ }
        queues.add(name);
      };
      return {
        async send(name, data, options = {}) {
          await ensureQueue(name);
          return boss.send(name, data as object, {
            expireInSeconds: options.expireInSeconds ?? DEFAULT_EXPIRE_SECONDS,
            retryLimit: options.retryLimit ?? 3,
            retryDelay: options.retryDelaySeconds ?? DEFAULT_RETRY_DELAY_SECONDS,
          });
        },
        async work(name, optionsOrHandler, maybeHandler) {
          const options = typeof optionsOrHandler === 'function' ? {} : optionsOrHandler;
          const handler = typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler;
          if (!handler) throw new Error('queue.work needs a handler');
          await ensureQueue(name);
          return boss.work(name, { pollingIntervalSeconds: options.pollingIntervalSeconds ?? 1 }, async (jobs: { id: string; data: unknown }[]) => {
            for (const job of jobs) await handler({ id: job.id, data: job.data as never });
          });
        },
        async stop() {
          await boss.stop({ graceful: false });
        },
      };
    },
  };
}
