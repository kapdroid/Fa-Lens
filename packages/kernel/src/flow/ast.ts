// Typed flow AST. The shape mirrors flowSchema (packages/kernel/src/pack/schemas) exactly, so anything the
// pack validator accepts is something the interpreter can run.
import type { Problem } from '../pack/types.ts';

export type StepKind = 'request' | 'query' | 'validate' | 'wait' | 'group' | 'script';

export type AssertKind = 'status' | 'schema' | 'equals' | 'lte' | 'gte' | 'rows' | 'contains' | 'matches' | 'delta';

export const ASSERT_KINDS: readonly AssertKind[] = ['status', 'schema', 'equals', 'lte', 'gte', 'rows', 'contains', 'matches', 'delta'];

export interface Assertion {
  kind: AssertKind;
  /** JSONPath into the response body; absent means the whole body, or the duration for lte/gte. */
  path?: string;
  expected: unknown;
  /** Tolerance for `delta`, which compares the value against `equals` within this margin. */
  delta?: number;
}

export interface Step {
  id: string;
  kind: StepKind;
  needs: string[];
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  source?: string;
  sql?: string;
  rule?: string;
  seconds?: number;
  expression?: string;
  extract: Record<string, string>;
  assert: Assertion[];
  steps: Step[];
}

export interface Flow {
  id: string;
  name?: string;
  steps: Step[];
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

function toAssertion(raw: unknown, path: string, problems: Problem[]): Assertion | null {
  if (!raw || typeof raw !== 'object') { problems.push({ path, message: 'assertion must be a map' }); return null; }
  const o = raw as Record<string, unknown>;
  const kind = ASSERT_KINDS.find(k => k in o);
  if (!kind) { problems.push({ path, message: `assertion needs one of ${ASSERT_KINDS.join(', ')}` }); return null; }
  const a: Assertion = { kind, expected: kind === 'delta' ? o['equals'] : o[kind] };
  const p = str(o['path']); if (p !== undefined) a.path = p;
  const d = num(o['delta']); if (d !== undefined) a.delta = d;
  if (kind === 'delta' && (d === undefined || a.expected === undefined)) problems.push({ path, message: 'delta needs a number and an equals value to compare against' });
  return a;
}

function toStep(raw: unknown, path: string, problems: Problem[]): Step | null {
  if (!raw || typeof raw !== 'object') { problems.push({ path, message: 'step must be a map' }); return null; }
  const o = raw as Record<string, unknown>;
  const id = str(o['id']); const kind = str(o['kind']);
  if (!id || !kind) { problems.push({ path, message: 'step needs an id and a kind' }); return null; }
  const step: Step = { id, kind: kind as StepKind, needs: [], extract: {}, assert: [], steps: [] };
  for (const n of Array.isArray(o['needs']) ? o['needs'] : []) { const s = str(n); if (s) step.needs.push(s); }
  const method = str(o['method']); if (method !== undefined) step.method = method;
  const url = str(o['url']); if (url !== undefined) step.url = url;
  const source = str(o['source']); if (source !== undefined) step.source = source;
  const sql = str(o['sql']); if (sql !== undefined) step.sql = sql;
  const rule = str(o['rule']); if (rule !== undefined) step.rule = rule;
  const expression = str(o['expression']); if (expression !== undefined) step.expression = expression;
  const seconds = num(o['seconds']); if (seconds !== undefined) step.seconds = seconds;
  if (o['body'] !== undefined) step.body = o['body'];
  const headers = o['headers'];
  if (headers && typeof headers === 'object') {
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) { const s = str(v); if (s !== undefined) h[k] = s; }
    step.headers = h;
  }
  const extract = o['extract'];
  if (extract && typeof extract === 'object') for (const [k, v] of Object.entries(extract as Record<string, unknown>)) { const s = str(v); if (s !== undefined) step.extract[k] = s; }
  const asserts = Array.isArray(o['assert']) ? o['assert'] : [];
  asserts.forEach((a, i) => { const parsed = toAssertion(a, `${path}/assert/${i}`, problems); if (parsed) step.assert.push(parsed); });
  const children = Array.isArray(o['steps']) ? o['steps'] : [];
  children.forEach((c, i) => { const parsed = toStep(c, `${path}/steps/${i}`, problems); if (parsed) step.steps.push(parsed); });
  return step;
}

/** Turn a parsed flow document into the typed AST. Problems are reported, never thrown. */
export function toFlow(doc: unknown): { flow: Flow | null; problems: Problem[] } {
  const problems: Problem[] = [];
  if (!doc || typeof doc !== 'object') return { flow: null, problems: [{ path: '', message: 'flow must be a map' }] };
  const o = doc as Record<string, unknown>;
  const id = str(o['id']);
  if (!id) problems.push({ path: '/id', message: 'flow needs an id' });
  const steps: Step[] = [];
  const rawSteps = Array.isArray(o['steps']) ? o['steps'] : [];
  rawSteps.forEach((s, i) => { const parsed = toStep(s, `/steps/${i}`, problems); if (parsed) steps.push(parsed); });
  if (!id) return { flow: null, problems };
  const flow: Flow = { id, steps };
  const name = str(o['name']); if (name !== undefined) flow.name = name;
  return { flow, problems };
}
