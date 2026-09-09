import { describe, expect, test } from 'vitest';
import { compileRule, DIALECTS } from '../../src/index.ts';
import { aggregateMatch, allRules, customCheck, presence, scope, uniqueness } from './fixtures.ts';

describe('compileRule', () => {
  test('every statement for every rule type and dialect is a read the adapter guard accepts', () => {
    for (const dialect of DIALECTS) {
      for (const rule of allRules) {
        const { statements } = compileRule(rule, dialect, scope);
        for (const s of statements) {
          expect(s.sql.trimStart()).toMatch(/^(SELECT|WITH)\b/);
          expect(s.sql).not.toContain(';');
          expect(s.dialect).toBe(dialect);
        }
      }
    }
  });

  test('scope values travel as parameters, never inlined into the statement', () => {
    for (const dialect of DIALECTS) {
      const { statements } = compileRule(aggregateMatch, dialect, scope);
      for (const s of statements) {
        expect(s.sql).not.toContain(scope.company);
        expect(s.sql).not.toContain(scope.dateFrom);
        expect(Object.values(s.params)).toContain(scope.company);
        expect(Object.values(s.params)).toContain(scope.dateFrom);
      }
    }
  });

  test('an aggregate_match compiles one fingerprint statement per side, anchor first', () => {
    const { statements } = compileRule(aggregateMatch, 'mssql', scope);
    expect(statements.map(s => s.side)).toEqual(['anchor', 'enrich']);
    expect(statements[0]?.sql).toBe(
      'SELECT [CycleNo], [ProductCode], CAST([CreatedOn] AS date) AS [bucket], COUNT(*) AS [n], SUM([Quantity]) AS [measure] ' +
      'FROM [VanCycleStock] WHERE [CompanyId] = @company AND [CreatedOn] >= @dateFrom AND [CreatedOn] < DATEADD(day, 1, @dateTo) ' +
      'GROUP BY [CycleNo], [ProductCode], CAST([CreatedOn] AS date)',
    );
  });

  test('the postgres and clickhouse dialects quote and parameterise in their own syntax', () => {
    const pg = compileRule(presence, 'postgres', scope).statements[0];
    expect(pg?.sql).toBe('SELECT "OrderNo", COUNT(*) AS "n" FROM "VanOrder" WHERE "CompanyId" = $1 AND "CreatedOn" >= $2 AND "CreatedOn" < ($3::date + 1) GROUP BY "OrderNo"');
    const ch = compileRule(presence, 'clickhouse', scope).statements[0];
    expect(ch?.sql).toContain('{company:String}');
    expect(ch?.sql).toContain('`VanOrder`');
  });

  test('a uniqueness rule asks for keys that appear more than once', () => {
    const s = compileRule(uniqueness, 'postgres', scope).statements[0];
    expect(s?.sql).toContain('HAVING COUNT(*) > 1');
  });

  test('a presence rule with no keys counts the rows in scope instead of grouping by nothing', () => {
    const { statements, problems } = compileRule({ id: 'any-orders', type: 'presence', source: 'fa_txn', table: 'VanOrder' }, 'mssql', scope);
    expect(problems).toEqual([]);
    expect(statements[0]?.sql).toBe('SELECT COUNT(*) AS [n] FROM [VanOrder] WHERE [CompanyId] = @company AND [CreatedOn] >= @dateFrom AND [CreatedOn] < DATEADD(day, 1, @dateTo)');
    expect(statements[0]?.sql).not.toContain('[]');
  });

  test('a custom-check compiles to no statement and says which reference is unknown', () => {
    const { statements, problems } = compileRule(customCheck, 'mssql', scope);
    expect(statements).toEqual([]);
    expect(problems[0]?.message).toMatch(/van-sales\/cycle-open-close/);
  });

  test('an unknown rule type is reported, not thrown', () => {
    const { statements, problems } = compileRule({ id: 'x', type: 'magic', source: 'fa_txn' } as never, 'mssql', scope);
    expect(statements).toEqual([]);
    expect(problems[0]?.message).toMatch(/magic/);
  });
});
