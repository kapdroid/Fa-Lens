import { describe, expect, test } from 'vitest';
import { runFlow, toFlow } from '../../src/index.ts';
import type { ExecuteRequest, ExecuteResult } from '../../src/index.ts';
import { context, dayCycle, flowDoc, withScriptStep, withUnknownVariable, withWaitAndGroup } from './fixtures.ts';

const flowOf = (yaml: string) => {
  const { flow, problems } = toFlow(flowDoc(yaml));
  expect(problems).toEqual([]);
  if (!flow) throw new Error('no flow');
  return flow;
};

const happy = (seen: ExecuteRequest[] = []) => {
  const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => {
    seen.push(req);
    if (req.stepId === 'login') return { status: 200, body: { data: { token: 'tok-abc', cycleNo: 14 } }, durationMs: 120 };
    if (req.stepId === 'day-begin') return { status: 200, body: { data: { cycleNo: 14 } }, durationMs: 300 };
    if (req.stepId === 'cycle-open') return { rows: [{ n: 1 }], body: [{ n: 1 }], durationMs: 40 };
    return { status: 200, body: {}, durationMs: 5 };
  };
  return { execute, seen };
};

describe('runFlow', () => {
  test('interpolates scope, variables, fixtures and earlier extracts before calling the executor', async () => {
    const { execute, seen } = happy();
    const verdict = await runFlow(flowOf(dayCycle), context, execute);
    expect(verdict.severity).toBe('ok');
    expect(seen[0]?.url).toBe('https://app.example/check/login');
    expect(seen[0]?.body).toEqual({ username: 'EMP-001' });
    expect(seen[1]?.headers?.['Authorization']).toBe('Bearer tok-abc');
    expect(seen[2]?.sql).toContain("EmployeeCode = EMP-001");
  });

  test('evaluates the ADR-0003 assertions: status, matches, gte, rows, equals, and latency through lte', async () => {
    const { execute } = happy();
    const verdict = await runFlow(flowOf(dayCycle), context, execute);
    const kinds = verdict.steps.flatMap(s => s.assertions.map(a => a.kind));
    expect(kinds).toEqual(expect.arrayContaining(['status', 'matches', 'lte', 'gte', 'rows', 'equals']));
    expect(verdict.steps.every(s => s.assertions.every(a => a.ok))).toBe(true);
  });

  test('a failed assertion is fail and names what it expected', async () => {
    const execute = async (): Promise<ExecuteResult> => ({ status: 500, body: { data: { token: 'nope', cycleNo: 0 } }, durationMs: 10 });
    const verdict = await runFlow(flowOf(dayCycle), context, execute);
    expect(verdict.steps[0]?.severity).toBe('fail');
    expect(verdict.steps[0]?.assertions[0]?.message).toMatch(/status.*200.*500/i);
  });

  test('a latency assertion fails when the executor reports a slower duration', async () => {
    const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => (
      req.stepId === 'login' ? { status: 200, body: { data: { token: 'tok-x', cycleNo: 2 } }, durationMs: 10 } : { status: 200, body: { data: { cycleNo: 2 } }, durationMs: 900 }
    );
    const verdict = await runFlow(flowOf(dayCycle), context, execute);
    const slow = verdict.steps.find(s => s.id === 'day-begin');
    expect(slow?.severity).toBe('fail');
    expect(slow?.assertions.find(a => a.kind === 'lte')?.message).toMatch(/900/);
  });

  test('a step whose needs did not succeed is skipped, not run', async () => {
    const seen: ExecuteRequest[] = [];
    const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => { seen.push(req); return { status: 500, body: {}, durationMs: 1 }; };
    const verdict = await runFlow(flowOf(dayCycle), context, execute);
    expect(verdict.steps.map(s => s.severity)).toEqual(['fail', 'skipped', 'skipped']);
    expect(seen).toHaveLength(1);
  });

  test('a wait step records its seconds without sleeping and a group runs its children in order', async () => {
    const { execute, seen } = happy();
    const started = Date.now();
    const verdict = await runFlow(flowOf(withWaitAndGroup), context, execute);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(verdict.steps.find(s => s.id === 'settle')?.severity).toBe('ok');
    expect(seen.map(r => r.stepId)).toEqual(['one', 'two']);
  });

  test('a script step is refused with an error verdict that names the sandbox unit', async () => {
    const { execute } = happy();
    const verdict = await runFlow(flowOf(withScriptStep), context, execute);
    expect(verdict.steps[0]?.severity).toBe('error');
    expect(verdict.steps[0]?.message).toMatch(/script step/i);
  });

  test('an unresolved variable is an error verdict, and the executor is never called', async () => {
    const seen: ExecuteRequest[] = [];
    const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => { seen.push(req); return { status: 200, body: {}, durationMs: 1 }; };
    const verdict = await runFlow(flowOf(withUnknownVariable), context, execute);
    expect(verdict.steps[0]?.severity).toBe('error');
    expect(verdict.steps[0]?.message).toMatch(/nowhere/);
    expect(seen).toEqual([]);
  });
});
