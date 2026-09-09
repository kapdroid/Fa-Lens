// Declarative rule types (ADR-0010) and what compiling one produces. The kernel builds SQL text only;
// executing it, and mapping a logical source to a dialect, belong to the adapters and the catalog.
import type { RULE_TYPES } from '../pack/schemas/index.ts';
import type { Problem } from '../pack/types.ts';

export type Dialect = 'mssql' | 'postgres' | 'clickhouse';
export const DIALECTS: readonly Dialect[] = ['mssql', 'postgres', 'clickhouse'];

/**
 * Why a bucket differs, in the product's own words (docs/design/screens.md), never codes:
 * - `balanced`      the two sides agree
 * - `physical short` the anchor side counts more than the enrich side (FA over DMS)
 * - `sync gap`      the bucket is on the anchor side and absent on the enrich side, past the grace window
 * - `audit pending` the same absence, but recent enough that the enrich side is expected to catch up
 * - `duplicate`     one side has more rows than distinct keys
 * - `unexplained`   any other difference; the run has evidence but no story yet
 */
export type Cause = 'balanced' | 'physical short' | 'sync gap' | 'audit pending' | 'duplicate' | 'unexplained';

export interface Side { source?: string; table?: string; measure?: string; keys?: string[]; columns?: string[] }

export type RuleType = (typeof RULE_TYPES)[number];

export interface Rule {
  id: string;
  type: RuleType;
  source: string;
  table?: string;
  keys?: string[];
  columns?: string[];
  anchor?: Side;
  enrich?: Side;
  window?: string;
  ref?: string;
  /** Column carrying the company id; packs may override the default. */
  company_column?: string;
  /** Column the date range filters on; packs may override the default. */
  date_column?: string;
}

export interface CompiledStatement {
  sql: string;
  params: Record<string, unknown>;
  dialect: Dialect;
  /** Which half of a two-sided rule this statement reads. */
  side?: 'anchor' | 'enrich';
}

export interface Compiled {
  statements: CompiledStatement[];
  problems: Problem[];
}

export interface Bucket {
  key: string;
  count: number;
  /** Distinct key tuples inside the bucket; a count above this means the side repeats a key. */
  distinct: number;
  sums: Record<string, number>;
  hash: string;
}
