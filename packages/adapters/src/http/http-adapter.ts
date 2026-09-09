// The http adapter (ADR-0005). It refuses what the catalog does not allow, keeps the budget, opens a
// breaker per server, and reports what every call cost. The request function is injectable so a test can
// prove that a refused call opens no socket at all.
import { request as undiciRequest } from 'undici';
import type { Adapter, Budget, Chunk, ExecContext, Health, LogLine, ResolvedServer, ResolvedStep, Verified } from '../adapter.ts';
import { DEFAULT_COOLDOWN_MS, DEFAULT_FAILURES_TO_OPEN, DEFAULT_MAX_BYTES, DEFAULT_MAX_ROWS } from '../adapter.ts';
import { breaker } from './breaker.ts';
import { refuse } from './guard.ts';
import { semaphore } from './semaphore.ts';
import type { Semaphore } from './semaphore.ts';

export interface HttpResponse {
  statusCode: number;
  body: AsyncIterable<Uint8Array>;
}

export type HttpRequestFn = (url: string, init: { method: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<HttpResponse>;

export interface HttpAdapterOptions {
  request?: HttpRequestFn;
  now?: () => number;
}

const READ_ONLY_METHODS = ['GET', 'HEAD'];

const defaultRequest: HttpRequestFn = async (url, init) => {
  const res = await undiciRequest(url, {
    method: init.method as 'GET',
    ...(init.headers ? { headers: init.headers } : {}),
    ...(init.signal ? { signal: init.signal } : {}),
  });
  return { statusCode: res.statusCode, body: res.body };
};

export function httpAdapter(options: HttpAdapterOptions = {}): Adapter {
  const send = options.request ?? defaultRequest;
  const now = options.now ?? Date.now;
  const permits = new Map<string, Semaphore>();
  const breakers = new Map<string, ReturnType<typeof breaker>>();

  const permitsFor = (server: ResolvedServer): Semaphore => {
    const existing = permits.get(server.server);
    if (existing) return existing;
    const fresh = semaphore(Math.max(1, server.budget.concurrency));
    permits.set(server.server, fresh);
    return fresh;
  };

  const breakerFor = (server: ResolvedServer): ReturnType<typeof breaker> => {
    const existing = breakers.get(server.server);
    if (existing) return existing;
    const fresh = breaker(server.budget.failuresToOpen ?? DEFAULT_FAILURES_TO_OPEN, server.budget.cooldownMs ?? DEFAULT_COOLDOWN_MS, now);
    breakers.set(server.server, fresh);
    return fresh;
  };

  return {
    kind: 'http',

    async *execute(step: ResolvedStep, ctx: ExecContext): AsyncIterable<Chunk> {
      const started = now();
      const server = step.server;
      const host = hostOf(step.url);
      const emit = (chunk: Chunk): Chunk => {
        report(ctx, { step, host, chunk });
        return chunk;
      };

      const refusal = refuse(step);
      if (refusal) {
        yield emit(blocked(server.server, refusal.verdict, now() - started));
        return;
      }

      const gate = breakerFor(server);
      if (!gate.allow(server.server)) {
        yield emit({ kind: 'error', server: server.server, rowsLookedAt: 0, truncated: false, durationMs: now() - started, verdict: 'source down' });
        return;
      }

      const chunk = await permitsFor(server).run(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), server.budget.timeoutMs);
        try {
          const res = await send(step.url, { method: step.method, ...(step.headers ? { headers: step.headers } : {}), signal: controller.signal });
          const read = await readBody(res.body, server.budget);
          // A 5xx is the source failing, not this call succeeding: it feeds the breaker, and only a
          // healthy answer clears the count.
          if (res.statusCode >= 500) gate.failed(server.server); else gate.succeeded(server.server);
          const rows = Array.isArray(read.value) ? read.value : undefined;
          const result: Chunk = {
            kind: 'data', server: server.server, status: res.statusCode,
            rowsLookedAt: rows ? rows.length : read.value === undefined ? 0 : 1,
            truncated: read.truncated, durationMs: now() - started, body: read.value,
          };
          if (rows) result.rows = rows;
          return result;
        } catch (e) {
          gate.failed(server.server);
          const aborted = controller.signal.aborted;
          return {
            kind: 'error' as const, server: server.server, rowsLookedAt: 0, truncated: false, durationMs: now() - started,
            verdict: aborted ? `timed out after ${server.budget.timeoutMs} ms` : `could not reach the source: ${(e as Error).message}`,
          };
        } finally {
          clearTimeout(timer);
        }
      });
      yield emit(chunk);
    },

    /** An http source is read-only when the catalog lets it be asked for nothing but reads. */
    async probeReadOnly(server: ResolvedServer): Promise<Verified> {
      const writing = server.methods.map(m => m.toUpperCase()).filter(m => !READ_ONLY_METHODS.includes(m));
      return writing.length
        ? { readOnly: false, reason: `${server.source} lists ${writing.join(', ')}; a read-only source lists only ${READ_ONLY_METHODS.join(' and ')}` }
        : { readOnly: true, reason: `${server.source} lists only ${server.methods.join(' and ')}` };
    },

    async health(server: ResolvedServer): Promise<Health> {
      const started = now();
      if (!server.baseUrl) return { ok: false, durationMs: 0, detail: 'no base url for this tenant' };
      try {
        const res = await send(server.baseUrl, { method: 'HEAD' });
        // Drain whatever came back so the connection is not left half-read.
        await readBody(res.body, { concurrency: 1, timeoutMs: server.budget.timeoutMs, maxBytes: 1024 });
        return { ok: res.statusCode < 500, durationMs: now() - started, detail: `status ${res.statusCode}` };
      } catch (e) {
        return { ok: false, durationMs: now() - started, detail: (e as Error).message };
      }
    },
  };
}

const blocked = (server: string, verdict: string, durationMs: number): Chunk => ({ kind: 'blocked', server, rowsLookedAt: 0, truncated: false, durationMs, verdict });

const hostOf = (url: string): string => { try { return new URL(url).host; } catch { return ''; } };

/** Read up to the budget. Past either cap the result is marked truncated rather than failed. */
async function readBody(body: AsyncIterable<Uint8Array>, budget: Budget): Promise<{ value: unknown; truncated: boolean }> {
  const maxBytes = budget.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRows = budget.maxRows ?? DEFAULT_MAX_ROWS;
  const parts: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for await (const part of body) {
    if (size + part.length > maxBytes) { parts.push(part.subarray(0, maxBytes - size)); truncated = true; break; }
    parts.push(part); size += part.length;
  }
  const text = Buffer.concat(parts).toString('utf8');
  if (!text) return { value: undefined, truncated };
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { value: text, truncated }; }
  if (Array.isArray(value) && value.length > maxRows) return { value: value.slice(0, maxRows), truncated: true };
  return { value, truncated };
}

/** The only path from a call to a log. Fields are named one by one; nothing is spread in. */
function report(ctx: ExecContext, at: { step: ResolvedStep; host: string; chunk: Chunk }): void {
  if (!ctx.log) return;
  const line: LogLine = {
    stepId: at.step.stepId,
    source: at.step.server.source,
    server: at.step.server.server,
    host: at.host,
    method: at.step.method.toUpperCase(),
    rowsLookedAt: at.chunk.rowsLookedAt,
    truncated: at.chunk.truncated,
    durationMs: at.chunk.durationMs,
  };
  if (at.chunk.status !== undefined) line.status = at.chunk.status;
  if (at.chunk.verdict !== undefined) line.verdict = at.chunk.verdict;
  if (ctx.runId !== undefined) line.runId = ctx.runId;
  if (ctx.companyId !== undefined) line.companyId = ctx.companyId;
  ctx.log(line);
}
