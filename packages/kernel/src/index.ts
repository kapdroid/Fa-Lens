// pure domain: flow, step, scope, verdict, rules, fingerprint diff, pack schema + validator
export const PACKAGE = '@falens/kernel' as const;

export { parsePack, kindOf } from './pack/parse.ts';
export { validatePack } from './pack/validate.ts';
export { hashPack, canonicalJson } from './pack/hash.ts';
export { CASE_KINDS, LOGICAL_SOURCES, RULE_TYPES, STEP_KINDS } from './pack/schemas/index.ts';
export type { Pack, PackFile, PackFileKind, Problem } from './pack/types.ts';

export { ASSERT_KINDS, toFlow } from './flow/ast.ts';
export type { Assertion, AssertKind, Flow, Step, StepKind } from './flow/ast.ts';
export { evaluate } from './flow/assert.ts';
export type { AssertionResult, StepOutcome } from './flow/assert.ts';
export { interpolate } from './flow/interpolate.ts';
export { readPath } from './flow/extract.ts';
export { runFlow } from './flow/run.ts';
export type { ExecuteRequest, ExecuteResult, Executor, FlowContext, FlowVerdict, StepVerdict } from './flow/run.ts';

export { SEVERITY_ORDER, emptyCounts, rank, rollup, worst } from './verdict/model.ts';
export type { Counts, Rolled, Severity } from './verdict/model.ts';

export { SCOPE_KEYS, scopeHash } from './scope/scope.ts';
export type { Scope } from './scope/scope.ts';
