// pure domain: flow, step, scope, verdict, rules, fingerprint diff, pack schema + validator
export const PACKAGE = '@falens/kernel' as const;

export { parsePack, kindOf } from './pack/parse.ts';
export { validatePack } from './pack/validate.ts';
export { hashPack, canonicalJson } from './pack/hash.ts';
export { CASE_KINDS, LOGICAL_SOURCES, RULE_TYPES, STEP_KINDS } from './pack/schemas/index.ts';
export type { Pack, PackFile, PackFileKind, Problem } from './pack/types.ts';
