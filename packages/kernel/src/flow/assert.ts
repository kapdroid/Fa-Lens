// One evaluator per ADR-0003 assertion. Latency is asserted with lte/gte against the duration the
// executor reports, so the kernel never reads a clock and stays deterministic.
import { Ajv } from 'ajv';
import type { AnySchema } from 'ajv';
import type { Assertion } from './ast.ts';
import { readPath } from './extract.ts';

const ajv = new Ajv({ allErrors: true, strict: false });

export interface StepOutcome {
  status?: number;
  body?: unknown;
  rows?: unknown[];
  durationMs?: number;
}

export interface AssertionResult {
  kind: Assertion['kind'];
  ok: boolean;
  message?: string;
}

const show = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v) ?? String(v));
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const valueOf = (a: Assertion, out: StepOutcome): unknown => (a.path === undefined ? out.body : readPath(out.body, a.path));

const numberOf = (a: Assertion, out: StepOutcome): number | undefined => {
  const raw = a.path === undefined ? out.durationMs : valueOf(a, out);
  return typeof raw === 'number' ? raw : undefined;
};

const where = (a: Assertion): string => (a.path === undefined ? 'the response' : a.path);

export function evaluate(a: Assertion, out: StepOutcome): AssertionResult {
  const fail = (message: string): AssertionResult => ({ kind: a.kind, ok: false, message });
  const pass: AssertionResult = { kind: a.kind, ok: true };
  switch (a.kind) {
    case 'status': {
      return out.status === a.expected ? pass : fail(`status: expected ${show(a.expected)}, got ${show(out.status)}`);
    }
    case 'equals': {
      const actual = valueOf(a, out);
      return same(actual, a.expected) ? pass : fail(`equals at ${where(a)}: expected ${show(a.expected)}, got ${show(actual)}`);
    }
    case 'lte':
    case 'gte': {
      const actual = numberOf(a, out);
      const bound = typeof a.expected === 'number' ? a.expected : Number.NaN;
      if (actual === undefined) return fail(`${a.kind} at ${where(a)}: expected a number, got ${show(valueOf(a, out))}`);
      const ok = a.kind === 'lte' ? actual <= bound : actual >= bound;
      return ok ? pass : fail(`${a.kind}: expected ${a.kind === 'lte' ? 'at most' : 'at least'} ${show(bound)}, got ${show(actual)}${a.path === undefined ? ' ms' : ''}`);
    }
    case 'rows': {
      const rows = out.rows ?? (Array.isArray(out.body) ? out.body : undefined);
      const count = rows?.length;
      return count === a.expected ? pass : fail(`rows: expected ${show(a.expected)}, got ${show(count)}`);
    }
    case 'contains': {
      const actual = valueOf(a, out);
      const ok = typeof actual === 'string' ? actual.includes(String(a.expected)) : Array.isArray(actual) ? actual.some(v => same(v, a.expected)) : false;
      return ok ? pass : fail(`contains at ${where(a)}: ${show(actual)} does not contain ${show(a.expected)}`);
    }
    case 'matches': {
      const actual = valueOf(a, out);
      if (typeof actual !== 'string') return fail(`matches at ${where(a)}: expected a string, got ${show(actual)}`);
      let re: RegExp;
      try { re = new RegExp(String(a.expected)); } catch { return fail(`matches at ${where(a)}: ${show(a.expected)} is not a valid regular expression`); }
      return re.test(actual) ? pass : fail(`matches at ${where(a)}: ${show(actual)} does not match ${show(a.expected)}`);
    }
    case 'delta': {
      const actual = numberOf(a, out);
      const expected = typeof a.expected === 'number' ? a.expected : Number.NaN;
      const tolerance = a.delta ?? 0;
      if (actual === undefined) return fail(`delta at ${where(a)}: expected a number, got ${show(valueOf(a, out))}`);
      return Math.abs(actual - expected) <= tolerance ? pass : fail(`delta at ${where(a)}: ${show(actual)} is further than ${show(tolerance)} from ${show(expected)}`);
    }
    case 'schema': {
      const actual = valueOf(a, out);
      const validate = ajv.compile(a.expected as AnySchema);
      if (validate(actual)) return pass;
      const first = validate.errors?.[0];
      return fail(`schema at ${where(a)}: ${first ? `${first.instancePath || '/'} ${first.message ?? 'is invalid'}` : 'does not match'}`);
    }
  }
}
