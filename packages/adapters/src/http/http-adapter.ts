// The http adapter (ADR-0005). It refuses what the catalog does not allow, keeps the budget, opens a
// breaker per origin, and reports what every call cost. The request function is injectable so a test can
// prove that a refused call opens no socket at all.
import { Agent, request as undiciRequest } from 'undici';
import type { Adapter, Budget, Chunk, ExecContext, Health, LogLine, ResolvedServer, ResolvedStep, Verified } from '../adapter.ts';
import { DEFAULT_COOLDOWN_MS, DEFAULT_FAILURES_TO_OPEN, DEFAULT_MAX_BYTES, DEFAULT_MAX_ROWS } from '../adapter.ts';
import { breaker } from './breaker.ts';
import type { Breaker } from './breaker.ts';
import { budgetKey, refuse, safeHeaders } from './guard.ts';
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
  /** Tests use their own budget registry; a worker shares one so a breaker cannot be reset by making a new adapter. */
  isolate?: boolean;
}

const READ_ONLY_METHODS = ['GET', 'HEAD'];

// A private dispatcher with no interceptors: whatever a process installs globally, this adapter never
// follows a redirect to a host the guard has not seen.
const dispatcher = new Agent();

const defaultRequest: HttpRequestFn = async (url, init) => {
  const res = await undiciRequest(url, {
    method: init.method as 'GET',
    dispatcher,
    ...(init.headers ? { headers: init.headers } : {}),
    ...(init.signal ? { signal: init.signal } : {}),
  });
  return { statusCode: res.statusCode, body: res.body };
};

/** Permits and breakers belong to an origin, not to an adapter instance or a display name. */
interface Budgets { permits: Map<string, Semaphore>; breakers: Map<string, Breaker> }
const shared: Budgets = { permits: new Map(), breakers: new Map() };

export function httpAdapter(options: HttpAdapterOptions = {}): Adapter {
  const send = options.request ?? defaultRequest;
  const now = options.now ?? Date.now;
  const budgets: Budgets = options.isolate ? { permits: new Map(), breakers: new Map() } : shared;

  const permitsFor = (key: string, budget: Budget): Semaphore => {
    const existing = budgets.permits.get(key);
    if (existing) return existing;
    const fresh = semaphore(Math.max(1, budget.concurrency));
    budgets.permits.set(key, fresh);
    return fresh;
  };

  const breakerFor = (key: string, budget: Budget): Breaker => {
    const existing = budgets.breakers.get(key);
    if (existing) return existing;
    const fresh = breaker(budget.failuresToOpen ?? DEFAULT_FAILURES_TO_OPEN, budget.cooldownMs ?? DEFAULT_COOLDOWN_MS, now);
    budgets.breakers.set(key, fresh);
    return fresh;
  };

  const call = async (
    url: string, method: string, headers: Record<string, string> | undefined,
    server: ResolvedServer, key: string, started: number, signal: AbortSignal | undefined,
  ): Promise<Chunk> => {
    const gate = breakerFor(key, server.budget);
    const permits = permitsFor(key, server.budget);
    if (!gate.allow(key)) return sourceDown(server.server, now() - started);

    return permits.run(async () => {
      // Checked again with the permit in hand: a step that queued while the source was healthy must not
      // reach it after the breaker has opened. This read does not consume the half-open trial the first
      // check may have granted.
      if (gate.state(key) === 'open') return sourceDown(server.server, now() - started);
      const controller = new AbortController();
      const stop = () => controller.abort();
      // The caller may already have walked away while this step waited for a permit; an aborted signal
      // fires no event, so it is read as well as listened to.
      if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop, { once: true });
      const timer = setTimeout(stop, server.budget.timeoutMs);
      try {
        const res = await send(url, { method, ...(headers ? { headers } : {}), signal: controller.signal });
        const read = await readBody(res.body, server.budget);
        if (res.statusCode >= 300 && res.statusCode < 400) {
          gate.failed(key);
          return { kind: 'error', server: server.server, rowsLookedAt: 0, truncated: false, durationMs: now() - started, status: res.statusCode, verdict: 'redirect refused' };
        }
        if (res.statusCode >= 500) gate.failed(key); else gate.succeeded(key);
        const result: Chunk = {
          kind: 'data', server: server.server, status: res.statusCode,
          rowsLookedAt: read.rowsLookedAt, truncated: read.truncated, durationMs: now() - started, body: read.value,
        };
        if (read.rows) result.rows = read.rows;
        return result;
      } catch (e) {
        gate.failed(key);
        return {
          kind: 'error' as const, server: server.server, rowsLookedAt: 0, truncated: false, durationMs: now() - started,
          verdict: signal?.aborted ? 'stopped' : controller.signal.aborted ? `timed out after ${server.budget.timeoutMs} ms` : reason(e),
        };
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', stop);
      }
    });
  };

  return {
    kind: 'http',

    async *execute(step: ResolvedStep, ctx: ExecContext): AsyncIterable<Chunk> {
      const started = now();
      const server = step.server;
      const host = hostOf(step.url);
      const emit = (chunk: Chunk): Chunk => { report(ctx, { step, host, chunk }); return chunk; };

      const refusal = refuse(step);
      if (refusal) { yield emit(blocked(server.server, refusal.verdict, now() - started)); return; }
      if (server.budget.concurrency <= 0 || server.budget.timeoutMs <= 0) {
        yield emit(blocked(server.server, 'BLOCKED · this source has no usable budget', now() - started));
        return;
      }

      yield emit(await call(step.url, step.method, safeHeaders(step.headers), server, budgetKey(step), started, ctx.signal));
    },

    /** What the catalog allows, not what the server would accept: this gates configuration, it probes nothing. */
    async probeReadOnly(server: ResolvedServer): Promise<Verified> {
      const writing = server.methods.map(m => m.toUpperCase()).filter(m => !READ_ONLY_METHODS.includes(m));
      return writing.length
        ? { readOnly: false, reason: `the catalog lists ${writing.join(', ')} for ${server.source}; a read-only source lists only ${READ_ONLY_METHODS.join(' and ')} (not probed)` }
        : { readOnly: true, reason: `the catalog lists only ${server.methods.join(' and ')} for ${server.source} (not probed)` };
    },

    /** Goes through the same guard, permit, breaker and timeout as any other call. */
    async health(server: ResolvedServer): Promise<Health> {
      const started = now();
      if (!server.baseUrl) return { ok: false, durationMs: 0, detail: 'no base url for this tenant' };
      if (!server.methods.map(m => m.toUpperCase()).includes('HEAD')) {
        return { ok: false, durationMs: 0, detail: 'the catalog does not list HEAD for this source' };
      }
      const step: ResolvedStep = { stepId: 'health', server, method: 'HEAD', url: server.baseUrl };
      const refusal = refuse(step);
      if (refusal) return { ok: false, durationMs: now() - started, detail: refusal.verdict };
      const chunk = await call(server.baseUrl, 'HEAD', undefined, server, budgetKey(step), started, undefined);
      return chunk.kind === 'data'
        ? { ok: (chunk.status ?? 500) < 500, durationMs: chunk.durationMs, detail: `status ${chunk.status}` }
        : { ok: false, durationMs: chunk.durationMs, detail: chunk.verdict ?? 'no answer' };
    },
  };
}

const blocked = (server: string, verdict: string, durationMs: number): Chunk => ({ kind: 'blocked', server, rowsLookedAt: 0, truncated: false, durationMs, verdict });
const sourceDown = (server: string, durationMs: number): Chunk => ({ kind: 'error', server, rowsLookedAt: 0, truncated: false, durationMs, verdict: 'source down' });
const hostOf = (url: string): string => { try { return new URL(url).host; } catch { return ''; } };

/** A fixed vocabulary. A driver's message can carry a url with a query string, and that must never reach a log. */
function reason(e: unknown): string {
  const message = (e as Error)?.message ?? '';
  if (/timeout|timed out/i.test(message)) return 'the source did not answer in time';
  if (/ENOTFOUND|EAI_AGAIN|dns/i.test(message)) return 'the source name did not resolve';
  if (/ECONNREFUSED/i.test(message)) return 'the source refused the connection';
  if (/ECONNRESET|socket hang up/i.test(message)) return 'the source closed the connection';
  if (/certificate|TLS|SSL|altname/i.test(message)) return 'the source presented a certificate this client would not accept';
  return 'the source could not be reached';
}

/** Rows are counted where an API really puts them: the list itself, or the largest list one or two levels in. */
function countRows(value: unknown, maxRows: number): { rows?: unknown[]; rowsLookedAt: number; truncated: boolean } {
  const lists: unknown[][] = [];
  if (Array.isArray(value)) lists.push(value);
  else if (value && typeof value === 'object') {
    for (const level1 of Object.values(value as Record<string, unknown>)) {
      if (Array.isArray(level1)) lists.push(level1);
      else if (level1 && typeof level1 === 'object') {
        for (const level2 of Object.values(level1 as Record<string, unknown>)) if (Array.isArray(level2)) lists.push(level2);
      }
    }
  }
  const biggest = lists.sort((a, b) => b.length - a.length)[0];
  if (!biggest) return { rowsLookedAt: value === undefined ? 0 : 1, truncated: false };
  if (biggest.length > maxRows) { biggest.length = maxRows; return { rows: biggest, rowsLookedAt: maxRows, truncated: true }; }
  return { rows: biggest, rowsLookedAt: biggest.length, truncated: false };
}

/** Read up to the budget. Past either cap the result is marked truncated rather than failed. */
async function readBody(body: AsyncIterable<Uint8Array>, budget: Budget): Promise<{ value: unknown; rows?: unknown[]; rowsLookedAt: number; truncated: boolean }> {
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
  if (!text) return { value: undefined, rowsLookedAt: 0, truncated };
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { value: text, rowsLookedAt: 1, truncated }; }
  const counted = countRows(value, maxRows);
  return { value, ...(counted.rows ? { rows: counted.rows } : {}), rowsLookedAt: counted.rowsLookedAt, truncated: truncated || counted.truncated };
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
