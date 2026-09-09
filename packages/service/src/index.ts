// use-cases: catalog, flows, runs, results, suggestions, auth/rbac; Zod contracts (ADR-0002)
export const PACKAGE = '@falens/service' as const;

export { VERBS, call, verbNames } from './registry.ts';
export type { Verb, VerbName, VerbOutput } from './registry.ts';
export { ok, problem } from './problem.ts';
export type { Result, ServiceProblem } from './problem.ts';
export { bindDeps } from './bindings.ts';
export type { BindOptions, ControlPool } from './bindings.ts';
export { RUN_JOB } from './verbs/runs.ts';
export * from './schemas.ts';
export type {
  Deps, FlowRecord, LockPort, MatrixCellRecord, ModuleRecord, ModulesPort,
  QueuePort, RunRecord, RunsPort, TxLike, VerdictsPort,
} from './ports.ts';
