import { expect, test } from 'vitest';
import { runFlow, toFlow } from '../../src/index.ts';
import type { ExecuteRequest, ExecuteResult } from '../../src/index.ts';
import { context, dayCycle, flowDoc, twoIndependentSteps } from '../flow/fixtures.ts';

const flow = () => {
  const { flow: f } = toFlow(flowDoc(dayCycle));
  if (!f) throw new Error('no flow');
  return f;
};

test('an executor that throws yields error, never fail', async () => {
  const verdict = await runFlow(flow(), context, async () => { throw new Error('ECONNRESET'); });
  expect(verdict.steps[0]?.severity).toBe('error');
  expect(verdict.steps[0]?.message).toMatch(/ECONNRESET/);
  expect(verdict.counts.fail).toBe(0);
  expect(verdict.severity).toBe('error');
});

test('a failed assertion yields fail, never error', async () => {
  const verdict = await runFlow(flow(), context, async () => ({ status: 404, body: { data: { token: 'tok-a', cycleNo: 1 } }, durationMs: 5 }));
  expect(verdict.steps[0]?.severity).toBe('fail');
  expect(verdict.counts.error).toBe(0);
  expect(verdict.severity).toBe('fail');
});

test('an errored step and the steps it blocks are counted separately, and the flow reads error', async () => {
  const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => {
    if (req.stepId === 'login') return { status: 200, body: { data: { token: 'tok-a', cycleNo: 3 } }, durationMs: 5 };
    if (req.stepId === 'day-begin') throw new Error('source down');
    return { rows: [{ n: 9 }], body: [{ n: 9 }], durationMs: 5 };
  };
  const verdict = await runFlow(flow(), context, execute);
  expect(verdict.counts.error).toBe(1);
  expect(verdict.counts.skipped).toBe(1);
  expect(verdict.severity).toBe('error');
});

test('a flow with one failing and one erroring step keeps both counts and reads fail, the worse of the two', async () => {
  const { flow: f } = toFlow(flowDoc(twoIndependentSteps));
  if (!f) throw new Error('no flow');
  const execute = async (req: ExecuteRequest): Promise<ExecuteResult> => {
    if (req.stepId === 'failing') return { status: 500, body: {}, durationMs: 5 };
    throw new Error('source down');
  };
  const verdict = await runFlow(f, context, execute);
  expect(verdict.counts.fail).toBe(1);
  expect(verdict.counts.error).toBe(1);
  expect(verdict.severity).toBe('fail');
});
