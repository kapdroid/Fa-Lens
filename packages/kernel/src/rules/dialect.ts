// The only place the three dialects differ. Everything else in the compiler is dialect-free.
import type { Dialect } from './types.ts';

export interface DialectSyntax {
  quote: (identifier: string) => string;
  param: (name: string, index: number) => string;
  /** Truncate a timestamp column to a day, the bucket the fingerprints group by (ADR-0014). */
  day: (expression: string) => string;
  /** Upper bound of an inclusive date range, written as a half-open comparison so an index can serve it. */
  dayAfter: (param: string) => string;
}

const strip = (identifier: string): string => identifier.replace(/[^A-Za-z0-9_]/g, '');

export const SYNTAX: Record<Dialect, DialectSyntax> = {
  mssql: {
    quote: id => `[${strip(id)}]`,
    param: name => `@${name}`,
    day: e => `CAST(${e} AS date)`,
    dayAfter: p => `DATEADD(day, 1, ${p})`,
  },
  postgres: {
    quote: id => `"${strip(id)}"`,
    param: (_name, index) => `$${index}`,
    day: e => `${e}::date`,
    dayAfter: p => `(${p}::date + 1)`,
  },
  clickhouse: {
    quote: id => `\`${strip(id)}\``,
    param: name => `{${name}:String}`,
    day: e => `toDate(${e})`,
    dayAfter: p => `addDays(toDate(${p}), 1)`,
  },
};
