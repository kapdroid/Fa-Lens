#!/usr/bin/env node
// Source catalog validator (ADR-0013, ADR-0005, ADR-0014). Zero dependencies.
//   node tool/check-catalog.mjs                 → validates packs/_sources/catalog.yaml
//   node tool/check-catalog.mjs --file <path>   → validates another file (used for the deliberately broken copies)
// Parses a deliberate YAML subset: 2-space indentation, `key: value`, `key:` (nested map), `- item` lists of scalars,
// `#` comments, quoted or bare scalars, ints and booleans. Rejects tabs, duplicate keys, anchors, multi-line strings.
// Validation is allow-list first (known top-level keys, known source names, known per-kind keys), blocklist second.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const root = resolve(dirname(here), '..');
const args = process.argv.slice(2);
const file = args.includes('--file') ? resolve(args[args.indexOf('--file') + 1]) : join(root, 'packs/_sources/catalog.yaml');

export function parseYamlSubset(text) {
  const rootObj = {}; const stack = [{ indent: -1, node: rootObj }];
  const lines = text.split('\n');
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n];
    if (/^[ ]*[\t ]/.test(line)) throw new Error(`line ${n + 1}: tabs or non-breaking spaces are not allowed in indentation`);
    const hash = line.search(/(^|\s)#/); if (hash >= 0) line = line.slice(0, hash);
    if (!line.trim()) continue;
    const indent = line.match(/^ */)[0].length;
    if (indent % 2) throw new Error(`line ${n + 1}: indentation must be a multiple of 2 spaces`);
    const body = line.trim();
    if (/[&*|>]/.test(body[0] || '')) throw new Error(`line ${n + 1}: anchors, aliases and block scalars are not supported`);
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
    if (Object.prototype.hasOwnProperty.call(parent, key)) throw new Error(`line ${n + 1}: duplicate key "${key}" (last-key-wins is not allowed)`);
    if (raw === undefined || raw === '') {
      let k = n + 1; while (k < lines.length && !lines[k].trim()) k++;
      const nextIsList = k < lines.length && lines[k].trim().startsWith('- ') && lines[k].match(/^ */)[0].length > indent;
      const child = nextIsList ? [] : {};
      parent[key] = child; stack.push({ indent, node: child });
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

const TENANTS = ['general', 'mars', 'colpal', 'haldiram', 'slmg', 'bdf'];
const V1_SOURCES = ['fa_txn', 'fa_master', 'report', 'dms', 'unify', 'app_api', 'dashboard_api'];
const TOP_KEYS = ['version', 'env', 'tenants', 'sources'];
const SQL_KEYS = ['kind', 'dialect', 'database', 'replica', 'confirm', 'status', 'credential', 'scope', 'limits', 'servers'];
const HTTP_KEYS = ['kind', 'confirm', 'status', 'credential', 'limits', 'baseUrl', 'methods'];
const SOON_KEYS = ['kind', 'dialect', 'status', 'confirm'];
const SUSPICIOUS = /pass|pwd|secret|token|key|dsn|conn|primary|writer|master$|^user|login|host/i;
const HOST = /^[a-z0-9](?:[a-z0-9-]{0,62})(?:\.[a-z0-9](?:[a-z0-9-]{0,62}))*$/;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const VAULT = /^vault:\/\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,126})$/;
const CEIL = { rows: 100000, timeoutMs: 60000, concurrency: 8, interactiveMaxDays: 31, windowDays: 7, pauseMs: 60000 };

export function validateCatalog(cat) {
  const problems = []; const warnings = [];
  const P = (m) => problems.push(m);

  for (const k of Object.keys(cat)) if (!TOP_KEYS.includes(k)) P(`top-level key "${k}" is not allowed (only ${TOP_KEYS.join(', ')})`);
  if (cat.version !== 1) P('version must be 1');
  if (!['prod', 'beta'].includes(cat.env)) P('env must be prod or beta (which environment this file describes)');
  if (!Array.isArray(cat.tenants) || cat.tenants.join() !== TENANTS.join()) P(`tenants must be exactly [${TENANTS.join(', ')}] in this order`);
  if (!cat.sources || typeof cat.sources !== 'object' || Array.isArray(cat.sources)) { P('sources map missing'); return { problems, warnings, count: 0 }; }

  // blocklist second net, whole document
  const KNOWN = new Set(['credential', 'scope', 'limits', 'servers', 'baseUrl', 'methods', 'kind', 'dialect', 'database', 'replica', 'confirm', 'status', 'company', 'date', 'rows', 'timeoutMs', 'concurrency', 'interactiveMaxDays', 'windowDays', 'pauseMs', ...TENANTS]);
  // source names (children of catalog.sources) are checked by the v1 allow-list, not by the suspicious-key regex
  const walk = (obj, path) => { for (const [k, v] of Object.entries(obj || {})) {
    const isSourceName = path === 'catalog.sources';
    if (!isSourceName && path !== 'catalog' && !KNOWN.has(k) && SUSPICIOUS.test(k)) P(`${path}.${k}: suspicious key (credentials, primaries, hosts never live in the catalog)`);
    if (typeof v === 'string' && /[;=]|password|pwd=/i.test(v) && k !== 'credential') P(`${path}.${k}: value looks like a connection string or credential`);
    if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, `${path}.${k}`); } };
  walk(cat, 'catalog');

  const names = Object.keys(cat.sources);
  for (const n of names) if (!V1_SOURCES.includes(n)) P(`sources.${n}: not a v1 source (allow-list: ${V1_SOURCES.join(', ')}); adding one needs an ADR`);
  for (const req of V1_SOURCES) if (!names.includes(req)) P(`sources.${req}: required in v1`);

  const tenantMap = (src, name, field, valueRe, what) => {
    const m = src[field];
    if (!m || typeof m !== 'object' || Array.isArray(m)) { P(`${name}.${field}: must be a tenant → value map`); return; }
    for (const t of TENANTS) if (!(t in m)) P(`${name}.${field}: missing tenant "${t}"`);
    for (const [k, v] of Object.entries(m)) {
      if (k === 'default') P(`${name}.${field}: "default" is not allowed in v1 (ADR-0013: every source is tenant-wise; shared sources need an ADR)`);
      else if (!TENANTS.includes(k)) P(`${name}.${field}: unknown tenant "${k}"`);
      if (typeof v !== 'string' || !valueRe.test(v)) P(`${name}.${field}.${k}: must be ${what}`);
    }
  };
  const limit = (src, name, key, required) => { const v = src.limits?.[key]; if (v === undefined) { if (required) P(`${name}.limits.${key}: required`); return; } if (!Number.isInteger(v) || v <= 0) P(`${name}.limits.${key}: positive integer required`); else if (v > CEIL[key]) P(`${name}.limits.${key}: must be ≤ ${CEIL[key]}`); };
  const onlyKeys = (src, name, allowed) => { for (const k of Object.keys(src)) if (!allowed.includes(k)) P(`${name}.${k}: key not allowed for this source kind (allowed: ${allowed.join(', ')})`); };

  for (const [name, src] of Object.entries(cat.sources)) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) { P(`${name}: must be a map`); continue; }
    if (src.shared !== undefined) P(`${name}.shared: not allowed in v1`);
    if (src.status === 'coming-soon') {
      onlyKeys(src, name, SOON_KEYS);
      if (src.kind === 'sql' && !['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: unknown`);
      continue;
    }
    if (src.status !== undefined && src.status !== 'active') P(`${name}.status: must be active or coming-soon`);
    if (typeof src.credential !== 'string' || !VAULT.test(src.credential)) P(`${name}.credential: must be vault://<key-vault-secret-name> (letters, digits, hyphens)`);
    if (src.confirm === true) warnings.push(`${name}: hosts are placeholders or unconfirmed replicas (confirm: true)`);
    if (src.kind === 'sql') {
      onlyKeys(src, name, SQL_KEYS);
      if (!['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: must be mssql, postgres, or clickhouse`);
      if (src.replica !== true) P(`${name}.replica: must be true (ADR-0013: only replicas are listed)`);
      tenantMap(src, name, 'servers', HOST, 'a bare hostname (no ports, credentials, or connection strings)');
      if (src.database && typeof src.database === 'object') tenantMap(src, name, 'database', IDENT, 'a database identifier');
      else if (typeof src.database !== 'string' || !IDENT.test(src.database)) P(`${name}.database: identifier or tenant map required`);
      if (!src.scope || typeof src.scope !== 'object' || !IDENT.test(String(src.scope.company))) P(`${name}.scope.company: column identifier required`);
      if (!src.scope || !IDENT.test(String(src.scope.date))) P(`${name}.scope.date: column identifier required`);
      for (const k of ['rows', 'timeoutMs', 'concurrency', 'interactiveMaxDays', 'windowDays']) limit(src, name, k, true);
      limit(src, name, 'pauseMs', false);
      for (const k of Object.keys(src.limits || {})) if (!(k in CEIL)) P(`${name}.limits.${k}: unknown limit`);
    } else if (src.kind === 'http') {
      onlyKeys(src, name, HTTP_KEYS);
      tenantMap(src, name, 'baseUrl', /^https:\/\/[a-z0-9.-]+(?::\d{2,5})?(?:\/[A-Za-z0-9._~\/-]*)?$/, 'an https:// origin without userinfo, query, or fragment');
      for (const k of ['timeoutMs', 'concurrency', 'interactiveMaxDays']) limit(src, name, k, true);
      if (!Array.isArray(src.methods) || !src.methods.length || src.methods.some(m => !['GET', 'HEAD', 'POST'].includes(m))) P(`${name}.methods: list of GET, HEAD, POST required (POST only for sandbox write-flows)`);
    } else P(`${name}.kind: must be sql or http`);
  }
  if (cat.sources.unify && cat.sources.unify.status !== 'coming-soon') P('sources.unify.status: must be coming-soon in v1');
  return { problems, warnings, count: names.length };
}

if (resolve(process.argv[1] || '') === here) {
  if (!existsSync(file)) { console.error(`check-catalog: FAIL\n - file not found: ${file}`); process.exit(1); }
  let cat;
  try { cat = parseYamlSubset(readFileSync(file, 'utf8')); } catch (e) { console.error(`check-catalog: FAIL\n - ${e.message}`); process.exit(1); }
  const { problems, warnings, count } = validateCatalog(cat);
  for (const w of warnings) console.log(` ! ${w}`);
  if (problems.length) { console.error('check-catalog: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
  console.log(`check-catalog: OK (${count} sources, ${warnings.length} placeholder warnings)`);
}
