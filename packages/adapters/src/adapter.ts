// The one interface every source goes through (ADR-0005). Nothing here reaches a database or a socket;
// the implementations do, and they are the only place the guards live.

export type AdapterKind = 'http' | 'mssql' | 'postgres' | 'clickhouse';

/** What the catalog allows this server to be asked for (ADR-0005 budgets, ADR-0014 layer 0). */
export interface Budget {
  /** Requests in flight per server, never exceeded. */
  concurrency: number;
  timeoutMs: number;
  /** Bytes of response body read before the result is marked truncated. */
  maxBytes?: number;
  /** Rows kept when the body is a list. The catalog carries this number for SQL sources; http defaults to the same. */
  maxRows?: number;
  failuresToOpen?: number;
  cooldownMs?: number;
}

/** One server resolved from the catalog for a tenant (ADR-0013). Never a primary, never a credential value. */
export interface ResolvedServer {
  source: string;
  kind: AdapterKind;
  /** The name shown in the product, not a hostname. */
  server: string;
  baseUrl?: string;
  database?: string;
  /** The methods the catalog lists for this source. For http this is the read-only guard. */
  methods: string[];
  /** True only for a sandbox source on a non-production environment, the one place a write-test may run
   *  (docs/architecture.md §8). Without it the adapter refuses any method beyond GET and HEAD, whatever
   *  the catalog lists. */
  sandbox?: boolean;
  budget: Budget;
  /** A vault reference, never a value. */
  credential?: string;
}

export interface ResolvedStep {
  stepId: string;
  server: ResolvedServer;
  /** http only. The SQL adapters (U-013) will carry sql and parameters instead, and this shape becomes a
   *  union on `server.kind` when the first of them lands. */
  method: string;
  url: string;
  headers?: Record<string, string>;
  sql?: string;
}

/** What the caller knows about the run. `log` receives fingerprints, never values. */
export interface ExecContext {
  runId?: string;
  companyId?: string;
  log?: (line: LogLine) => void;
  /** Fires when the caller stops caring — a run cancelled, an iterator dropped. The source is let go too. */
  signal?: AbortSignal;
}

/** The only shape that reaches a log: fields chosen one by one, so a value cannot arrive by accident. */
export interface LogLine {
  stepId: string;
  source: string;
  server: string;
  host: string;
  method: string;
  status?: number;
  rowsLookedAt: number;
  truncated: boolean;
  durationMs: number;
  verdict?: string;
  runId?: string;
  companyId?: string;
}

export type ChunkKind = 'data' | 'blocked' | 'error';

/** Every result says what it cost, whichever way it ended (ADR-0005 consequences). */
export interface Chunk {
  kind: ChunkKind;
  server: string;
  rowsLookedAt: number;
  truncated: boolean;
  durationMs: number;
  status?: number;
  body?: unknown;
  rows?: unknown[];
  /** Plain words for the product: `BLOCKED · method not allowed`, `source down`, `timed out after 15000 ms`. */
  verdict?: string;
}

export interface Verified { readOnly: boolean; reason: string }

export interface Health { ok: boolean; durationMs: number; detail?: string }

export interface Adapter {
  kind: AdapterKind;
  execute: (step: ResolvedStep, ctx: ExecContext) => AsyncIterable<Chunk>;
  probeReadOnly: (server: ResolvedServer) => Promise<Verified>;
  health: (server: ResolvedServer) => Promise<Health>;
}

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
/** The row cap the catalog already uses for SQL sources; http has no field for it yet. */
export const DEFAULT_MAX_ROWS = 50_000;
export const DEFAULT_FAILURES_TO_OPEN = 5;
export const DEFAULT_COOLDOWN_MS = 30_000;
