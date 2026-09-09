// The one place a verb is declared (ADR-0002). A skin reads this and adapts transport; it cannot invent
// a verb, because there is nowhere else to put one.
import type { ZodType, z } from 'zod';
import type { Deps } from './ports.ts';
import { ok, problem } from './problem.ts';
import type { Result } from './problem.ts';
import { getMatrix, listFlows, listModules } from './verbs/reads.ts';
import { createRun, getRun } from './verbs/runs.ts';

export interface Verb {
  name: string;
  description: string;
  input: ZodType;
  output: ZodType;
  handler: (input: never, deps: Deps) => Promise<unknown>;
}

export const VERBS = {
  list_modules: listModules,
  list_flows: listFlows,
  get_matrix: getMatrix,
  create_run: createRun,
  get_run: getRun,
} as const satisfies Record<string, Verb>;

export type VerbName = keyof typeof VERBS;

export const verbNames = (): VerbName[] => Object.keys(VERBS) as VerbName[];

/** What a named verb answers with, so a caller of a known verb gets its type without restating it. */
export type VerbOutput<K extends VerbName> = z.output<(typeof VERBS)[K]['output']>;

const firstIssue = (error: unknown): { message: string; field?: string } => {
  const issues = (error as { issues?: { path: (string | number)[]; message: string }[] }).issues;
  const issue = issues?.[0];
  if (!issue) return { message: (error as Error).message };
  const field = issue.path.join('.');
  return field ? { message: `${field}: ${issue.message}`, field } : { message: issue.message };
};

/** Parse the input, run the handler, parse the output. Every failure comes back as a problem a skin can render. */
export async function call<K extends VerbName>(name: K, input: unknown, deps: Deps): Promise<Result<VerbOutput<K>>>;
export async function call(name: string, input: unknown, deps: Deps): Promise<Result<unknown>>;
export async function call(name: string, input: unknown, deps: Deps): Promise<Result<unknown>> {
  const verb = (VERBS as Record<string, Verb | undefined>)[name];
  if (!verb) return problem({ code: 'unknown_verb', message: `there is no verb called '${name}'` });

  const parsedInput = verb.input.safeParse(input);
  if (!parsedInput.success) {
    const { message, field } = firstIssue(parsedInput.error);
    return problem({ code: 'invalid_input', message, ...(field ? { field } : {}) });
  }

  let raw: unknown;
  try {
    raw = await verb.handler(parsedInput.data as never, deps);
  } catch (e) {
    return problem({ code: 'failed', message: (e as Error).message });
  }
  if (raw === undefined) return problem({ code: 'not_found', message: `${name} found nothing for that request` });

  const parsedOutput = verb.output.safeParse(raw);
  if (!parsedOutput.success) {
    const { message } = firstIssue(parsedOutput.error);
    return problem({ code: 'invalid_output', message: `${name} returned a shape its own contract forbids: ${message}` });
  }
  return ok(parsedOutput.data);
}
