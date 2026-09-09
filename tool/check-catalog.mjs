#!/usr/bin/env node
// Source catalog validator (ADR-0013, ADR-0005, ADR-0014). Zero dependencies.
//   node tool/check-catalog.mjs                 → validates packs/_sources/catalog.yaml
//   node tool/check-catalog.mjs --file <path>   → validates another file (used for the deliberately broken copy)
// Parses a deliberate YAML subset: 2-space indentation, `key: value`, `key:` (nested map), `- item` lists of scalars,
// `#` comments, quoted or bare scalars, ints and booleans. No anchors, no multi-line strings, no flow maps.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const file = args.includes('--file') ? resolve(args[args.indexOf('--file') + 1]) : join(root, 'packs/_sources/catalog.yaml');

export function parseYamlSubset(text) {
  const rootObj = {}; const stack = [{ indent: -1, node: rootObj, key: null }];
  const lines = text.split('\n');
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n];
    const hash = line.search(/(^|\s)#/); if (hash >= 0) line = line.slice(0, hash);
    if (!line.trim()) continue;
    const indent = line.match(/^ */)[0].length;
    if (indent % 2) throw new Error(`line ${n + 1}: indentation must be a multiple of 2 spaces`);
    const body = line.trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    if (body.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`line ${n + 1}: list item outside a list`);
      parent.push(scalar(body.slice(2)));
      continue;
    }
    const m = body.match(/^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/);
    if (!m) throw new Error(`line ${n + 1}: cannot parse "${body}"`);
    const [, key, raw] = m;
    if (Array.isArray(parent)) throw new Error(`line ${n + 1}: map key inside a list`);
    if (raw === undefined || raw === '') {
      // nested map or list: peek next non-empty line
      let k = n + 1; while (k < lines.length && !lines[k].trim()) k++;
      const nextIsList = k < lines.length && lines[k].trim().startsWith('- ') && lines[k].match(/^ */)[0].length > indent;
      const child = nextIsList ? [] : {};
      parent[key] = child; stack.push({ indent, node: child, key });
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      parent[key] = raw.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(scalar);
    } else parent[key] = scalar(raw);
  }
  return rootObj;
}
function scalar(v) {
  const s = v.trim();
  if (/^".*"$/.test(s) || /^'.*'$/.test(s)) return s.slice(1, -1);
  if (/^-?\d+$/.test(s)) return Number(s);
  if (s === 'true') return true; if (s === 'false') return false; if (s === 'null' || s === '~') return null;
  return s;
}

export function validateCatalog(cat) {
  const problems = []; const warnings = [];
  const P = (m) => problems.push(m);
  const TENANTS = ['general', 'mars', 'colpal', 'haldiram', 'slmg', 'bdf'];
  const FORBIDDEN_KEYS = /^(password|pwd|connectionString|connection_string|primary|primaryServer|secret|token)$/i;

  if (cat.version !== 1) P('version must be 1');
  if (!Array.isArray(cat.tenants) || cat.tenants.join() !== TENANTS.join()) P(`tenants must be exactly [${TENANTS.join(', ')}] in this order`);
  if (!cat.sources || typeof cat.sources !== 'object') { P('sources map missing'); return { problems, warnings, count: 0 }; }

  const walk = (obj, path) => { for (const [k, v] of Object.entries(obj || {})) { if (FORBIDDEN_KEYS.test(k)) P(`${path}.${k}: forbidden key (credentials and primaries never live in the catalog)`); if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, `${path}.${k}`); } };
  walk(cat.sources, 'sources');

  const tenantMap = (src, name, field) => {
    const m = src[field];
    if (!m || typeof m !== 'object' || Array.isArray(m)) { P(`${name}.${field}: must be a tenant → value map`); return; }
    for (const t of TENANTS) if (!(t in m)) P(`${name}.${field}: missing tenant "${t}"`);
    for (const k of Object.keys(m)) {
      if (k === 'default' && src.shared !== true) P(`${name}.${field}: "default" is only allowed with shared: true (ADR-0013: every source is tenant-wise)`);
      else if (k !== 'default' && !TENANTS.includes(k)) P(`${name}.${field}: unknown tenant "${k}"`);
      if (typeof m[k] !== 'string' || !m[k]) P(`${name}.${field}.${k}: must be a non-empty string`);
    }
  };
  const posInt = (src, name, key) => { const v = src.limits?.[key]; if (!Number.isInteger(v) || v <= 0) P(`${name}.limits.${key}: positive integer required`); };

  for (const [name, src] of Object.entries(cat.sources)) {
    if (!src || typeof src !== 'object') { P(`${name}: must be a map`); continue; }
    if (!['sql', 'http'].includes(src.kind)) P(`${name}.kind: must be sql or http`);
    if (src.status === 'coming-soon') {
      if (src.servers || src.baseUrl) P(`${name}: coming-soon sources must not declare servers or baseUrl`);
      if (src.kind === 'sql' && !['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: unknown`);
      continue;
    }
    if (typeof src.credential !== 'string' || !/^vault:\/\/[A-Za-z0-9._-]+$/.test(src.credential)) P(`${name}.credential: must be a vault://<name> reference`);
    if (src.confirm === true) warnings.push(`${name}: hosts are placeholders (confirm: true)`);
    if (src.kind === 'sql') {
      if (!['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: must be mssql, postgres, or clickhouse`);
      if (src.replica !== true) P(`${name}.replica: must be true (ADR-0013: only replicas are listed)`);
      tenantMap(src, name, 'servers');
      if (src.database && typeof src.database === 'object') tenantMap(src, name, 'database'); else if (typeof src.database !== 'string' || !src.database) P(`${name}.database: string or tenant map required`);
      if (!src.scope || typeof src.scope.company !== 'string') P(`${name}.scope.company: column name required`);
      if (!src.scope || typeof src.scope.date !== 'string') P(`${name}.scope.date: column name required`);
      for (const k of ['rows', 'timeoutMs', 'concurrency', 'interactiveMaxDays']) posInt(src, name, k);
      if (src.limits?.interactiveMaxDays > 31) P(`${name}.limits.interactiveMaxDays: must be ≤ 31 (ADR-0014)`);
    } else if (src.kind === 'http') {
      tenantMap(src, name, 'baseUrl');
      for (const [t, u] of Object.entries(src.baseUrl || {})) if (typeof u === 'string' && !/^https:\/\//.test(u)) P(`${name}.baseUrl.${t}: must be https://`);
      for (const k of ['timeoutMs', 'concurrency']) posInt(src, name, k);
    }
  }
  for (const req of ['fa_txn', 'fa_master', 'report', 'dms', 'unify', 'app_api', 'dashboard_api']) if (!(req in cat.sources)) P(`sources.${req}: required in v1`);
  if (cat.sources.unify && cat.sources.unify.status !== 'coming-soon') P('sources.unify.status: must be coming-soon in v1');
  return { problems, warnings, count: Object.keys(cat.sources).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(file)) { console.error(`check-catalog: FAIL\n - file not found: ${file}`); process.exit(1); }
  let cat;
  try { cat = parseYamlSubset(readFileSync(file, 'utf8')); } catch (e) { console.error(`check-catalog: FAIL\n - ${e.message}`); process.exit(1); }
  const { problems, warnings, count } = validateCatalog(cat);
  for (const w of warnings) console.log(` ! ${w}`);
  if (problems.length) { console.error('check-catalog: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
  console.log(`check-catalog: OK (${count} sources, ${warnings.length} placeholder warnings)`);
}
