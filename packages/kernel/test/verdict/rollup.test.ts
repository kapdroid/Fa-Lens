import { expect, test } from 'vitest';
import { rollup, worst } from '../../src/index.ts';

test('worst follows none < skipped < ok < warn < error < fail', () => {
  expect(worst('ok', 'warn')).toBe('warn');
  expect(worst('error', 'fail')).toBe('fail');
  expect(worst('error', 'warn')).toBe('error');
  expect(worst('none', 'skipped')).toBe('skipped');
  expect(worst('ok', 'ok')).toBe('ok');
});

test('rollup folds children to the worst severity and counts every child', () => {
  const r = rollup([{ severity: 'ok' }, { severity: 'warn' }, { severity: 'fail' }, { severity: 'error' }]);
  expect(r.severity).toBe('fail');
  expect(r.counts).toMatchObject({ ok: 1, warn: 1, fail: 1, error: 1 });
});

test('rollup folds step to flow to testing type to module to company, counting direct children at each level', () => {
  const apis = rollup([{ severity: 'ok' }, { severity: 'ok' }]);
  const validations = rollup([{ severity: 'ok' }, { severity: 'fail' }]);
  const vanSales = rollup([apis, validations]);
  const journeyPlan = rollup([{ severity: 'ok' }]);
  const company = rollup([vanSales, journeyPlan]);
  expect(apis.severity).toBe('ok');
  expect(validations.severity).toBe('fail');
  expect(vanSales.severity).toBe('fail');
  expect(company.severity).toBe('fail');
  // counts answer "how many of my children are in this state", so the company counts modules
  // (one failing Van Sales, one healthy Journey Plan), not the flows underneath them.
  expect(vanSales.counts).toMatchObject({ ok: 1, fail: 1 });
  expect(company.counts).toMatchObject({ ok: 1, fail: 1 });
});

test('a module with no runs is none, and an errored module does not read as a product failure', () => {
  expect(rollup([]).severity).toBe('none');
  const sourceDown = rollup([{ severity: 'error' }, { severity: 'ok' }]);
  expect(sourceDown.severity).toBe('error');
  expect(sourceDown.counts.fail).toBe(0);
});
