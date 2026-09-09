// http, mssql, postgres, clickhouse behind one Adapter interface; budgets, breaker, read-only guard
export const PACKAGE = '@falens/adapters' as const;

export { DEFAULT_COOLDOWN_MS, DEFAULT_FAILURES_TO_OPEN, DEFAULT_MAX_BYTES, DEFAULT_MAX_ROWS } from './adapter.ts';
export type { Adapter, AdapterKind, Budget, Chunk, ChunkKind, ExecContext, Health, LogLine, ResolvedServer, ResolvedStep, Verified } from './adapter.ts';
export { budgetKey, refuse, safeHeaders } from './http/guard.ts';
export type { GuardOptions, Refusal } from './http/guard.ts';
export { semaphore } from './http/semaphore.ts';
export type { Semaphore } from './http/semaphore.ts';
export { breaker } from './http/breaker.ts';
export type { Breaker, BreakerState } from './http/breaker.ts';
export { httpAdapter } from './http/http-adapter.ts';
export type { HttpAdapterOptions, HttpRequestFn, HttpResponse } from './http/http-adapter.ts';
