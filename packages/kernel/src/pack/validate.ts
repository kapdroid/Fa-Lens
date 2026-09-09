import { Ajv } from 'ajv';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import formatsModule from 'ajv-formats';
import { caseSchema, catalogRefsSchema, drilldownSchema, flowSchema, packSchema, presetsSchema, ruleSchema } from './schemas/index.ts';
import type { Pack, PackFile, Problem } from './types.ts';

const SCOPE_VARIABLES = ['env', 'tenant', 'company', 'user', 'dateFrom', 'dateTo', 'app_api', 'dashboard_api'];
const CREDENTIAL_KEY = /(password|passwd|secret|token|api[-_]?key|connection[-_]?string)/i;
const SERVER_KEY = /^(server|host|hostname)$/i;
const SERVER_VALUE = /\b[a-z0-9-]+\.(database\.windows\.net|azurewebsites\.net|cloudapp\.azure\.com|internal|local)\b/i;
const TEMPLATE = /\{\{\s*([A-Za-z_][\w-]*)(?:\.[\w-]+)*\s*\}\}/g;

// ajv-formats is CommonJS: under NodeNext the default import is the module namespace whose .default is the plugin.
const addFormats = ((formatsModule as unknown as { default?: unknown }).default ?? formatsModule) as (ajv: Ajv) => Ajv;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const SCHEMAS: Partial<Record<PackFile['kind'], AnySchema>> = {
  manifest: packSchema, flow: flowSchema, rule: ruleSchema, case: caseSchema, drilldown: drilldownSchema, presets: presetsSchema, catalogRefs: catalogRefsSchema,
};
const validators = new Map<PackFile['kind'], ValidateFunction>();
const validatorFor = (kind: PackFile['kind']) => {
  const schema = SCHEMAS[kind];
  if (!schema) return null;
  let v = validators.get(kind);
  if (!v) { v = ajv.compile(schema); validators.set(kind, v); }
  return v;
};

const describe = (e: ErrorObject): string => {
  if (e.keyword === 'enum') return `must be one of ${(e.params as { allowedValues: unknown[] }).allowedValues.join(', ')}`;
  return e.message ?? e.keyword;
};

function walk(value: unknown, visit: (pointer: string, key: string | null, value: unknown, parentKey: string | null) => void, pointer = '', parentKey: string | null = null): void {
  if (Array.isArray(value)) { value.forEach((v, i) => walk(v, visit, `${pointer}/${i}`, parentKey)); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) { visit(`${pointer}/${k}`, k, v, parentKey); walk(v, visit, `${pointer}/${k}`, k); }
  }
}

function schemaProblems(file: PackFile): Problem[] {
  const v = validatorFor(file.kind);
  if (!v || v(file.doc)) return [];
  return (v.errors ?? []).map(e => ({ path: `${file.path}#${e.instancePath}`, message: describe(e) }));
}

function variableProblems(file: PackFile, declared: Set<string>): Problem[] {
  const doc = file.doc as { steps?: unknown[] } | null;
  if (!doc || !Array.isArray(doc.steps)) return [];
  const problems: Problem[] = [];
  const known = new Set(declared);
  const visitStep = (step: unknown, pointer: string) => {
    if (!step || typeof step !== 'object') return;
    const s = step as Record<string, unknown>;
    const text = JSON.stringify(s);
    for (const m of text.matchAll(TEMPLATE)) {
      const root = m[1]!;
      if (!known.has(root)) problems.push({ path: `${file.path}#${pointer}`, message: `undeclared variable {{${root}}}: declare it in pack.yaml variables, extract it in an earlier step, or use a scope or fixtures name` });
    }
    if (s['extract'] && typeof s['extract'] === 'object') for (const k of Object.keys(s['extract'] as object)) known.add(k);
    if (Array.isArray(s['steps'])) s['steps'].forEach((child, i) => visitStep(child, `${pointer}/steps/${i}`));
  };
  doc.steps.forEach((step, i) => visitStep(step, `/steps/${i}`));
  return problems;
}

function reachabilityProblems(file: PackFile): Problem[] {
  const doc = file.doc as { steps?: unknown[] } | null;
  if (!doc || !Array.isArray(doc.steps)) return [];
  const problems: Problem[] = [];
  const seen = new Set<string>();
  const visit = (step: unknown, pointer: string) => {
    if (!step || typeof step !== 'object') return;
    const s = step as Record<string, unknown>;
    for (const need of Array.isArray(s['needs']) ? s['needs'] as unknown[] : []) {
      if (typeof need === 'string' && !seen.has(need)) problems.push({ path: `${file.path}#${pointer}`, message: `unreachable: needs '${need}', which is not an earlier step of this flow, so it can never run` });
    }
    if (typeof s['id'] === 'string') seen.add(s['id']);
    if (Array.isArray(s['steps'])) s['steps'].forEach((child, i) => visit(child, `${pointer}/steps/${i}`));
  };
  doc.steps.forEach((step, i) => visit(step, `/steps/${i}`));
  return problems;
}

function secretAndServerProblems(file: PackFile): Problem[] {
  if (file.kind === 'knowledge') return [];
  const problems: Problem[] = [];
  walk(file.doc, (pointer, key, value, parentKey) => {
    if (key && SERVER_KEY.test(key)) problems.push({ path: `${file.path}#${pointer}`, message: `server name in a pack: sources are named by logical name and resolved through packs/_sources (ADR-0013)` });
    if (typeof value !== 'string') return;
    if (key && CREDENTIAL_KEY.test(key) && parentKey !== 'extract' && !value.startsWith('vault://') && !value.startsWith('{{') && !value.startsWith('$')) {
      problems.push({ path: `${file.path}#${pointer}`, message: `credential value: use a vault:// reference, never the value itself (ADR-0013)` });
    }
    if (SERVER_VALUE.test(value)) problems.push({ path: `${file.path}#${pointer}`, message: `server name in a pack: '${value}' looks like a host; use a logical source name (ADR-0013)` });
  });
  return problems;
}

/** Every problem a pack has, with the file path and JSON pointer. An empty list means the pack is publishable by schema. */
export function validatePack(pack: Pack): Problem[] {
  const problems: Problem[] = [];
  const declared = new Set<string>(SCOPE_VARIABLES);
  declared.add('fixtures'); declared.add('generators');
  const vars = pack.manifest?.['variables'];
  if (vars && typeof vars === 'object') for (const k of Object.keys(vars as object)) declared.add(k);
  for (const file of pack.files) {
    problems.push(...schemaProblems(file));
    if (file.kind === 'flow') { problems.push(...variableProblems(file, declared)); problems.push(...reachabilityProblems(file)); }
    problems.push(...secretAndServerProblems(file));
  }
  return problems;
}
