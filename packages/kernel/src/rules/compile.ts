// Declarative rule → SELECT-only SQL text. Scope values are always parameters, so no value can ever
// change the shape of the statement and the adapter's read-only guard (ADR-0005) always accepts it.
import type { Problem } from '../pack/types.ts';
import type { Scope } from '../scope/scope.ts';
import { SYNTAX } from './dialect.ts';
import type { Compiled, CompiledStatement, Dialect, Rule, Side } from './types.ts';

const DEFAULT_COMPANY_COLUMN = 'CompanyId';
const DEFAULT_DATE_COLUMN = 'CreatedOn';

/** A statement the adapter guard will accept: one read, no statement separator. */
export function guardOk(sql: string): boolean {
  return /^\s*(SELECT|WITH)\b/i.test(sql) && !sql.includes(';');
}

interface Ctx {
  dialect: Dialect;
  q: (id: string) => string;
  params: Record<string, unknown>;
  companyColumn: string;
  dateColumn: string;
  scopeWhere: string;
}

function context(rule: Rule, dialect: Dialect, scope: Scope): Ctx {
  const s = SYNTAX[dialect];
  const companyColumn = rule.company_column ?? DEFAULT_COMPANY_COLUMN;
  const dateColumn = rule.date_column ?? DEFAULT_DATE_COLUMN;
  const params: Record<string, unknown> = { company: scope.company, dateFrom: scope.dateFrom, dateTo: scope.dateTo };
  const scopeWhere = `${s.quote(companyColumn)} = ${s.param('company', 1)} AND ${s.quote(dateColumn)} >= ${s.param('dateFrom', 2)} AND ${s.quote(dateColumn)} < ${s.dayAfter(s.param('dateTo', 3))}`;
  return { dialect, q: id => s.quote(id), params, companyColumn, dateColumn, scopeWhere };
}

const list = (ctx: Ctx, ids: readonly string[]): string => ids.map(ctx.q).join(', ');

function fingerprintStatement(ctx: Ctx, side: Side, table: string, keys: readonly string[], measure: string | undefined, sideName: 'anchor' | 'enrich'): CompiledStatement {
  const s = SYNTAX[ctx.dialect];
  const bucket = s.day(ctx.q(ctx.dateColumn));
  const measureColumn = measure ? `, SUM(${ctx.q(measure)}) AS ${ctx.q('measure')}` : '';
  const sql =
    `SELECT ${list(ctx, keys)}, ${bucket} AS ${ctx.q('bucket')}, COUNT(*) AS ${ctx.q('n')}${measureColumn} ` +
    `FROM ${ctx.q(table)} WHERE ${ctx.scopeWhere} ` +
    `GROUP BY ${list(ctx, keys)}, ${bucket}`;
  return { sql, params: { ...ctx.params }, dialect: ctx.dialect, side: sideName };
}

function countStatement(ctx: Ctx, table: string, keys: readonly string[], having?: string): CompiledStatement {
  const sql =
    `SELECT ${list(ctx, keys)}, COUNT(*) AS ${ctx.q('n')} FROM ${ctx.q(table)} WHERE ${ctx.scopeWhere} ` +
    `GROUP BY ${list(ctx, keys)}${having ? ` ${having}` : ''}`;
  return { sql, params: { ...ctx.params }, dialect: ctx.dialect };
}

function totalStatement(ctx: Ctx, table: string): CompiledStatement {
  const sql = `SELECT COUNT(*) AS ${ctx.q('n')} FROM ${ctx.q(table)} WHERE ${ctx.scopeWhere}`;
  return { sql, params: { ...ctx.params }, dialect: ctx.dialect };
}

function columnsStatement(ctx: Ctx, table: string, keys: readonly string[], columns: readonly string[], side: 'anchor' | 'enrich'): CompiledStatement {
  const sql = `SELECT ${list(ctx, [...keys, ...columns])} FROM ${ctx.q(table)} WHERE ${ctx.scopeWhere}`;
  return { sql, params: { ...ctx.params }, dialect: ctx.dialect, side };
}

/** Compile one rule into the statements a worker will run. Problems are reported, never thrown. */
export function compileRule(rule: Rule, dialect: Dialect, scope: Scope): Compiled {
  const problems: Problem[] = [];
  const statements: CompiledStatement[] = [];
  const ctx = context(rule, dialect, scope);
  const at = `rules/${rule.id}`;
  const keys = rule.keys ?? [];

  switch (rule.type) {
    case 'presence': {
      // Without keys the question is simply "are there any rows in scope", so the statement counts
      // without grouping; routing a '*' through the identifier quoter would produce broken SQL.
      if (!rule.table) problems.push({ path: at, message: 'presence needs a table' });
      else statements.push(keys.length ? countStatement(ctx, rule.table, keys) : totalStatement(ctx, rule.table));
      break;
    }
    case 'uniqueness': {
      if (!rule.table) problems.push({ path: at, message: 'uniqueness needs a table' });
      else if (!keys.length) problems.push({ path: at, message: 'uniqueness needs the keys that must be unique' });
      else statements.push(countStatement(ctx, rule.table, keys, 'HAVING COUNT(*) > 1'));
      break;
    }
    case 'field_match': {
      const anchorTable = rule.anchor?.table; const enrichTable = rule.enrich?.table;
      const columns = rule.columns ?? [];
      if (!anchorTable || !enrichTable) problems.push({ path: at, message: 'field_match needs an anchor table and an enrich table' });
      else if (!columns.length) problems.push({ path: at, message: 'field_match needs the columns to compare' });
      else {
        statements.push(columnsStatement(ctx, anchorTable, keys, columns, 'anchor'));
        statements.push(columnsStatement(ctx, enrichTable, rule.enrich?.keys ?? keys, rule.enrich?.columns ?? columns, 'enrich'));
      }
      break;
    }
    case 'aggregate_match': {
      const anchor = rule.anchor; const enrich = rule.enrich;
      if (!anchor?.table || !enrich?.table) problems.push({ path: at, message: 'aggregate_match needs an anchor table and an enrich table' });
      else {
        statements.push(fingerprintStatement(ctx, anchor, anchor.table, anchor.keys ?? keys, anchor.measure, 'anchor'));
        statements.push(fingerprintStatement(ctx, enrich, enrich.table, enrich.keys ?? anchor.keys ?? keys, enrich.measure, 'enrich'));
      }
      break;
    }
    case 'chain': {
      const from = rule.anchor?.table; const to = rule.enrich?.table;
      if (!from || !to) problems.push({ path: at, message: 'chain needs the table a key starts in and the table it must reach' });
      else if (!keys.length) problems.push({ path: at, message: 'chain needs the keys that travel the hop' });
      else {
        statements.push({ ...countStatement(ctx, from, keys), side: 'anchor' });
        statements.push({ ...countStatement(ctx, to, keys), side: 'enrich' });
      }
      break;
    }
    case 'custom-check': {
      problems.push({ path: at, message: `custom-check '${rule.ref ?? '(no ref)'}' has no named check in the kernel yet; the registry of named checks arrives with the pack that needs it` });
      break;
    }
    default:
      problems.push({ path: at, message: `unknown rule type '${rule.type}'` });
  }

  for (const s of statements) if (!guardOk(s.sql)) problems.push({ path: at, message: 'compiled a statement the read-only guard would reject' });
  return { statements, problems };
}
