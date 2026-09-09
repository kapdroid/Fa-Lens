// The interpreter. StepVerdict and FlowVerdict live here beside the interpreter that produces them;
// verdict/model.ts owns the severity algebra they use. All I/O belongs to the caller: `execute` performs the request or query and returns
// what happened. The kernel interpolates, extracts, asserts, and decides the verdict — nothing else.
import type { Scope } from '../scope/scope.ts';
import type { Counts, Severity } from '../verdict/model.ts';
import { emptyCounts, worst } from '../verdict/model.ts';
import type { Flow, Step, StepKind } from './ast.ts';
import type { AssertionResult, StepOutcome } from './assert.ts';
import { evaluate } from './assert.ts';
import { readPath } from './extract.ts';
import type { Bag } from './interpolate.ts';
import { interpolate } from './interpolate.ts';

export interface FlowContext {
  scope: Scope;
  /** Pack manifest variables. */
  variables?: Record<string, unknown>;
  fixtures?: Record<string, unknown>;
  /** Logical HTTP bases, e.g. app_api and dashboard_api (ADR-0013: never server names in the flow). */
  bases?: Record<string, string>;
}

export interface ExecuteRequest {
  stepId: string;
  kind: StepKind;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  source?: string;
  sql?: string;
  rule?: string;
}

export type ExecuteResult = StepOutcome;

export type Executor = (request: ExecuteRequest) => Promise<ExecuteResult>;

export interface StepVerdict {
  id: string;
  kind: StepKind;
  severity: Severity;
  message?: string;
  durationMs?: number;
  assertions: AssertionResult[];
  steps?: StepVerdict[];
}

export interface FlowVerdict {
  id: string;
  severity: Severity;
  counts: Counts;
  steps: StepVerdict[];
  extracts: Record<string, unknown>;
}

const SUCCEEDED: readonly Severity[] = ['ok', 'warn'];

function bagOf(flow: Flow, context: FlowContext, extracts: Record<string, unknown>): Bag {
  return { ...context.scope, ...(context.bases ?? {}), ...flow.variables, ...(context.variables ?? {}), fixtures: context.fixtures ?? {}, ...extracts };
}

function requestOf(step: Step, bag: Bag): { request: ExecuteRequest; missing: string[] } {
  const missing: string[] = [];
  const take = <T,>(v: T | undefined): T | undefined => (v === undefined ? undefined : (interpolate(v, bag, missing).value as T));
  const request: ExecuteRequest = { stepId: step.id, kind: step.kind };
  const method = take(step.method); if (method !== undefined) request.method = method;
  const url = take(step.url); if (url !== undefined) request.url = url;
  const headers = take(step.headers); if (headers !== undefined) request.headers = headers;
  if (step.body !== undefined) request.body = take(step.body);
  const source = take(step.source); if (source !== undefined) request.source = source;
  const sql = take(step.sql); if (sql !== undefined) request.sql = sql;
  const rule = take(step.rule); if (rule !== undefined) request.rule = rule;
  return { request, missing };
}

async function runStep(flow: Flow, step: Step, context: FlowContext, execute: Executor, done: Map<string, Severity>, extracts: Record<string, unknown>): Promise<StepVerdict> {
  const base: StepVerdict = { id: step.id, kind: step.kind, severity: 'ok', assertions: [] };

  const blocked = step.needs.filter(n => !SUCCEEDED.includes(done.get(n) ?? 'none'));
  if (blocked.length) return { ...base, severity: 'skipped', message: `skipped: ${blocked.join(', ')} did not succeed` };

  if (step.kind === 'script') {
    return { ...base, severity: 'error', message: `script step '${step.id}' is not interpreted here: the sandboxed expression runtime (ADR-0003, isolated-vm) is its own unit` };
  }

  if (step.kind === 'group') {
    const children: StepVerdict[] = [];
    let severity: Severity = 'none';
    for (const child of step.steps) {
      const verdict = await runStep(flow, child, context, execute, done, extracts);
      done.set(child.id, verdict.severity);
      children.push(verdict);
      severity = worst(severity, verdict.severity);
    }
    return { ...base, severity: severity === 'none' ? 'ok' : severity, steps: children };
  }

  const bag = bagOf(flow, context, extracts);

  if (step.kind === 'wait') {
    const { missing } = requestOf(step, bag);
    if (missing.length) return { ...base, severity: 'error', message: `unresolved variable ${missing.join(', ')}` };
    return { ...base, severity: 'ok', message: `waited ${step.seconds ?? 0}s`, durationMs: (step.seconds ?? 0) * 1000 };
  }

  const { request, missing } = requestOf(step, bag);
  if (missing.length) return { ...base, severity: 'error', message: `unresolved variable ${[...new Set(missing)].join(', ')}: declare it, extract it in an earlier step, or use a scope name` };

  let outcome: ExecuteResult;
  try {
    outcome = await execute(request);
  } catch (e) {
    return { ...base, severity: 'error', message: `${step.kind} step failed to run: ${(e as Error).message}` };
  }

  for (const [name, path] of Object.entries(step.extract)) extracts[name] = readPath(outcome.body, path);

  const assertions = step.assert.map(a => evaluate(a, outcome));
  const verdict: StepVerdict = { ...base, severity: assertions.some(a => !a.ok) ? 'fail' : 'ok', assertions };
  if (outcome.durationMs !== undefined) verdict.durationMs = outcome.durationMs;
  const firstFailure = assertions.find(a => !a.ok)?.message;
  if (firstFailure !== undefined) verdict.message = firstFailure;
  return verdict;
}

/** Run a flow. `execute` is the only door to the outside world; everything else here is pure. */
export async function runFlow(flow: Flow, context: FlowContext, execute: Executor): Promise<FlowVerdict> {
  const done = new Map<string, Severity>();
  const extracts: Record<string, unknown> = {};
  const steps: StepVerdict[] = [];
  const counts = emptyCounts();
  let severity: Severity = 'none';
  for (const step of flow.steps) {
    const verdict = await runStep(flow, step, context, execute, done, extracts);
    done.set(step.id, verdict.severity);
    steps.push(verdict);
    counts[verdict.severity] += 1;
    severity = worst(severity, verdict.severity);
  }
  return { id: flow.id, severity, counts, steps, extracts };
}
