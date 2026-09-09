#!/usr/bin/env node
// Source catalog validator (ADR-0013, ADR-0005, ADR-0014). Zero dependencies.
//   node tool/check-catalog.mjs                 → validates packs/_sources/catalog.yaml
//   node tool/check-catalog.mjs --file <path>   → validates another file
//   node tool/check-catalog.mjs --selftest      → mutates the prod catalog in memory into known-bad shapes and asserts
//                                                 each is rejected with the expected message (runs in the gate)
// Parses a deliberate YAML subset: 2-space indentation, `key: value`, `key:` (nested map), `- item` lists of scalars,
// `#` comments, quoted or bare scalars, ints and booleans. Rejects tabs/NBSP, duplicate keys, prototype keys, anchors.
// Validation is allow-list first (top-level keys, v1 source names, per-kind keys, value shapes), blocklist second.
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = realpathSync(fileURLToPath(import.meta.url));
const root = resolve(dirname(here), '..');
const args = process.argv.slice(2);
const file = args.includes('--file') ? resolve(args[args.indexOf('--file') + 1]) : join(root, 'packs/_sources/catalog.yaml');

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function parseYamlSubset(text) {
  const rootObj = Object.create(null); const stack = [{ indent: -1, node: rootObj }];
  const lines = text.split('\n');
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n];
    if (/^ *[\t ]/.test(line)) throw new Error(`line ${n + 1}: tabs or non-breaking spaces are not allowed in indentation`);
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
    if (BAD_KEYS.has(key)) throw new Error(`line ${n + 1}: key "${key}" is not allowed`);
    if (Array.isArray(parent)) throw new Error(`line ${n + 1}: map key inside a list`);
    if (own(parent, key)) throw new Error(`line ${n + 1}: duplicate key "${key}" (last-key-wins is not allowed)`);
    if (raw === undefined || raw === '') {
      let k = n + 1; while (k < lines.length && !lines[k].trim()) k++;
      const nextIsList = k < lines.length && lines[k].trim().startsWith('- ') && lines[k].match(/^ */)[0].length > indent;
      const child = nextIsList ? [] : Object.create(null);
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
const COMING_SOON_ALLOWED = ['unify'];
const TOP_KEYS = ['version', 'env', 'tenants', 'sources'];
const SQL_KEYS = ['kind', 'dialect', 'database', 'replica', 'confirm', 'status', 'credential', 'scope', 'limits', 'servers'];
const HTTP_KEYS = ['kind', 'confirm', 'status', 'credential', 'limits', 'baseUrl', 'methods'];
const SOON_KEYS = ['kind', 'dialect', 'status', 'confirm'];
const SCOPE_KEYS = ['company', 'date'];
const SQL_LIMITS = ['rows', 'timeoutMs', 'concurrency', 'interactiveMaxDays', 'windowDays', 'pauseMs'];
const HTTP_LIMITS = ['timeoutMs', 'concurrency', 'interactiveMaxDays'];
const SUSPICIOUS = /pass|pwd|secret|token|key|dsn|conn|primary|writer|master$|^user|login|host/i;
const HOST = /^[a-z0-9](?:[a-z0-9-]{0,62})(?:\.[a-z0-9](?:[a-z0-9-]{0,62}))*$/;
const HOST_NET = /primary|writer|-rw(\.|$)|^\d{1,3}(\.\d{1,3}){3}$/i;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const VAULT = /^vault:\/\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,126})$/;
const URL_RE = /^https:\/\/[a-z0-9.-]+(?::\d{2,5})?(?:\/[A-Za-z0-9._~\/-]*)?$/;
const CEIL = { rows: 100000, timeoutMs: 60000, concurrency: 8, interactiveMaxDays: 31, windowDays: 7, pauseMs: 60000 };

export function validateCatalog(cat) {
  const problems = []; const warnings = [];
  const P = (m) => problems.push(m);

  for (const k of Object.keys(cat)) if (!TOP_KEYS.includes(k)) P(`top-level key "${k}" is not allowed (only ${TOP_KEYS.join(', ')})`);
  if (cat.version !== 1) P('version must be 1');
  if (!['prod', 'beta'].includes(cat.env)) P('env must be prod or beta (which environment this file describes)');
  if (!Array.isArray(cat.tenants) || cat.tenants.join() !== TENANTS.join()) P(`tenants must be exactly [${TENANTS.join(', ')}] in this order`);
  if (!cat.sources || typeof cat.sources !== 'object' || Array.isArray(cat.sources)) { P('sources map missing'); return { problems, warnings, count: 0 }; }

  // blocklist second net, whole document incl. arrays; only sources.<name>.credential may look like a credential
  const KNOWN = new Set([...SQL_KEYS, ...HTTP_KEYS, ...SCOPE_KEYS, ...SQL_LIMITS, ...TENANTS]);
  const walk = (obj, path, depth) => {
    for (const [k, v] of Object.entries(obj || {})) {
      const isSourceName = depth === 1 && path === 'catalog.sources';
      if (!isSourceName && depth >= 1 && !KNOWN.has(k) && SUSPICIOUS.test(k)) P(`${path}.${k}: suspicious key (credentials, primaries, hosts never live in the catalog)`);
      const isSourceCredential = depth === 2 && k === 'credential';
      const check = (val, at) => { if (typeof val === 'string' && /[;=]|password|pwd=|:\/\/[^/]*@/i.test(val) && !isSourceCredential) P(`${at}: value looks like a connection string or credential`); };
      if (Array.isArray(v)) v.forEach((x, i) => check(x, `${path}.${k}[${i}]`));
      else if (v && typeof v === 'object') walk(v, `${path}.${k}`, depth + 1);
      else check(v, `${path}.${k}`);
    }
  };
  walk(cat, 'catalog', 0);

  const names = Object.keys(cat.sources);
  for (const n of names) if (!V1_SOURCES.includes(n)) P(`sources.${n}: not a v1 source (allow-list: ${V1_SOURCES.join(', ')}); adding one needs an ADR`);
  for (const req of V1_SOURCES) if (!names.includes(req)) P(`sources.${req}: required in v1`);

  const tenantMap = (src, name, field, valueRe, what, net) => {
    const m = src[field];
    if (!m || typeof m !== 'object' || Array.isArray(m)) { P(`${name}.${field}: must be a tenant → value map`); return; }
    for (const t of TENANTS) if (!own(m, t)) P(`${name}.${field}: missing tenant "${t}"`);
    for (const [k, v] of Object.entries(m)) {
      if (k === 'default') P(`${name}.${field}: "default" is not allowed in v1 (ADR-0013: every source is tenant-wise; shared sources need an ADR)`);
      else if (!TENANTS.includes(k)) P(`${name}.${field}: unknown tenant "${k}"`);
      if (typeof v !== 'string' || !valueRe.test(v)) P(`${name}.${field}.${k}: must be ${what}`);
      else if (net && net.test(v)) P(`${name}.${field}.${k}: "${v}" looks like a primary/writer or an IP literal (ADR-0013: replicas by hostname only)`);
    }
  };
  const limit = (src, name, key, required) => { const v = src.limits?.[key]; if (v === undefined) { if (required) P(`${name}.limits.${key}: required`); return; } if (!Number.isInteger(v) || v <= 0) P(`${name}.limits.${key}: positive integer required`); else if (v > CEIL[key]) P(`${name}.limits.${key}: must be ≤ ${CEIL[key]}`); };
  const onlyKeys = (obj, label, allowed) => { for (const k of Object.keys(obj || {})) if (!allowed.includes(k)) P(`${label}.${k}: key not allowed (allowed: ${allowed.join(', ')})`); };

  for (const [name, src] of Object.entries(cat.sources)) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) { P(`${name}: must be a map`); continue; }
    if (own(src, 'shared')) P(`${name}.shared: not allowed in v1`);
    if (own(src, 'confirm') && typeof src.confirm !== 'boolean') P(`${name}.confirm: must be true or false`);
    if (src.status === 'coming-soon') {
      if (!COMING_SOON_ALLOWED.includes(name)) P(`${name}.status: coming-soon is allowed only for ${COMING_SOON_ALLOWED.join(', ')} in v1`);
      onlyKeys(src, name, SOON_KEYS);
      if (!['sql', 'http'].includes(src.kind)) P(`${name}.kind: must be sql or http`);
      if (src.kind === 'sql' && !['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: must be mssql, postgres, or clickhouse`);
      if (src.kind === 'http' && own(src, 'dialect')) P(`${name}.dialect: not allowed for http`);
      continue;
    }
    if (own(src, 'status') && src.status !== 'active') P(`${name}.status: must be active or coming-soon`);
    if (COMING_SOON_ALLOWED.includes(name)) P(`${name}.status: must be coming-soon in v1`);
    if (typeof src.credential !== 'string' || !VAULT.test(src.credential)) P(`${name}.credential: must be vault://<key-vault-secret-name> (letters, digits, hyphens)`);
    if (src.confirm === true) warnings.push(`${name}: hosts are placeholders or unconfirmed replicas (confirm: true)`);
    if (src.kind === 'sql') {
      onlyKeys(src, name, SQL_KEYS);
      if (!['mssql', 'postgres', 'clickhouse'].includes(src.dialect)) P(`${name}.dialect: must be mssql, postgres, or clickhouse`);
      if (src.replica !== true) P(`${name}.replica: must be true (ADR-0013: only replicas are listed)`);
      tenantMap(src, name, 'servers', HOST, 'a bare hostname (no ports, credentials, or connection strings)', HOST_NET);
      if (src.database && typeof src.database === 'object') tenantMap(src, name, 'database', IDENT, 'a database identifier');
      else if (typeof src.database !== 'string' || !IDENT.test(src.database)) P(`${name}.database: identifier or tenant map required`);
      if (!src.scope || typeof src.scope !== 'object') P(`${name}.scope: map with company and date required`);
      else { onlyKeys(src.scope, `${name}.scope`, SCOPE_KEYS); for (const k of SCOPE_KEYS) if (!IDENT.test(String(src.scope[k]))) P(`${name}.scope.${k}: column identifier required`); }
      onlyKeys(src.limits, `${name}.limits`, SQL_LIMITS);
      for (const k of ['rows', 'timeoutMs', 'concurrency', 'interactiveMaxDays', 'windowDays']) limit(src, name, k, true);
      limit(src, name, 'pauseMs', false);
    } else if (src.kind === 'http') {
      onlyKeys(src, name, HTTP_KEYS);
      tenantMap(src, name, 'baseUrl', URL_RE, 'an https:// origin without userinfo, query, or fragment');
      onlyKeys(src.limits, `${name}.limits`, HTTP_LIMITS);
      for (const k of HTTP_LIMITS) limit(src, name, k, true);
      if (!Array.isArray(src.methods) || !src.methods.length || src.methods.some(m => !['GET', 'HEAD', 'POST'].includes(m))) P(`${name}.methods: list of GET, HEAD, POST required`);
      else if (cat.env === 'prod' && src.methods.includes('POST')) P(`${name}.methods: POST is not allowed in the prod catalog (sandbox write-flows live in the beta overlay)`);
    } else P(`${name}.kind: must be sql or http`);
  }
  return { problems, warnings, count: names.length };
}

// ---- self-test: known-bad mutations of the prod catalog must be rejected with the expected message
export function selftest(text) {
  const cases = [
    ['missing tenant', s => s.replace('      slmg: slmg-transaction-db\n', ''), 'missing tenant "slmg"'],
    ['default server', s => s.replace('      bdf: bdf-transaction-db\n', '      bdf: bdf-transaction-db\n      default: transaction-db-x\n'), '"default" is not allowed'],
    ['replica false', s => s.replace('database: FA_Reports\n    replica: true', 'database: FA_Reports\n    replica: false'), 'report.replica: must be true'],
    ['non-vault credential', s => s.replace('credential: vault://dms-readonly', 'credential: not-a-vault-ref'), 'dms.credential: must be vault://'],
    ['forbidden key', s => s.replace('    database: FA_Reports\n', '    database: FA_Reports\n    password: x\n'), 'report.password'],
    ['top-level connection string', s => 'connectionString: Server=x;Password=y\n' + s, 'top-level key "connectionString" is not allowed'],
    ['duplicate key', s => s.replace('    credential: vault://fa-txn-readonly\n', '    credential: plain-first\n    credential: vault://fa-txn-readonly\n'), 'duplicate key "credential"'],
    ['prototype key', s => s.replace('    database: FA_Transactions\n', '    database: FA_Transactions\n    __proto__:\n      connectionString: Server=x;Password=y\n'), 'key "__proto__" is not allowed'],
    ['connection string as host', s => s.replace('      general: transaction-db\n', '      general: "Server=tcp:transaction-db,1433;Password=y"\n'), 'must be a bare hostname'],
    ['primary-looking host', s => s.replace('      mars: mars-transaction-db\n', '      mars: mars-transaction-primary\n'), 'looks like a primary/writer'],
    ['unify active', s => s.replace('dialect: clickhouse\n    status: coming-soon', 'dialect: clickhouse\n    status: active'), 'unify.status: must be coming-soon'],
    ['coming-soon on fa_txn', s => s.replace('  fa_txn:\n    kind: sql\n    dialect: mssql\n', '  fa_txn:\n    kind: sql\n    dialect: mssql\n    status: coming-soon\n'), 'coming-soon is allowed only for unify'],
    ['interactiveMaxDays 45', s => s.replace('      interactiveMaxDays: 31\n      windowDays: 7', '      interactiveMaxDays: 45\n      windowDays: 7'), 'interactiveMaxDays: must be ≤ 31'],
    ['rows ceiling', s => s.replace('      rows: 50000\n', '      rows: 99999999\n'), 'rows: must be ≤ 100000'],
    ['http scheme', s => s.replace('mars: https://app-api-mars', 'mars: http://app-api-mars'), 'app_api.baseUrl.mars: must be an https://'],
    ['POST on prod', s => s.replace('methods: [GET, HEAD]', 'methods: [GET, HEAD, POST]'), 'POST is not allowed in the prod catalog'],
    ['credential under scope', s => s.replace('      company: CompanyId\n      date: CreatedAt\n', '      company: CompanyId\n      date: CreatedAt\n      credential: "Server=x;Password=y"\n'), 'scope.credential: key not allowed'],
    ['confirm not boolean', s => s.replace('    confirm: true\n    credential: vault://report-readonly', '    confirm: postgres://ro:x@h/db\n    credential: vault://report-readonly'), 'report.confirm: must be true or false'],
    ['extra source', s => s.replace('  dashboard_api:', '  fa_txn_rw:\n    kind: http\n    credential: vault://x\n    methods: [GET]\n    limits:\n      timeoutMs: 1\n      concurrency: 1\n      interactiveMaxDays: 1\n    baseUrl:\n      general: https://a\n      mars: https://a\n      colpal: https://a\n      haldiram: https://a\n      slmg: https://a\n      bdf: https://a\n\n  dashboard_api:'), 'sources.fa_txn_rw: not a v1 source'],
    ['tab indentation', s => s.replace('    kind: sql\n    dialect: mssql\n    database: FA_Transactions', '    kind: sql\n\tdialect: mssql\n    database: FA_Transactions'), 'tabs or non-breaking spaces'],
  ];
  const failures = [];
  let base; try { base = validateCatalog(parseYamlSubset(text)); } catch (e) { return [`prod catalog does not parse: ${e.message}`]; }
  if (base.problems.length) failures.push(`prod catalog must be valid before self-test: ${base.problems[0]}`);
  for (const [name, mutate, expect] of cases) {
    const mutated = mutate(text);
    if (mutated === text) { failures.push(`${name}: mutation did not apply (fixture out of date)`); continue; }
    let msgs;
    try { msgs = validateCatalog(parseYamlSubset(mutated)).problems; } catch (e) { msgs = [e.message]; }
    if (!msgs.some(m => m.includes(expect))) failures.push(`${name}: expected a problem containing "${expect}", got ${msgs.length ? JSON.stringify(msgs.slice(0, 3)) : 'OK'}`);
  }
  return failures;
}

if (realpathSync(resolve(process.argv[1] || '')) === here) {
  if (!existsSync(file)) { console.error(`check-catalog: FAIL\n - file not found: ${file}`); process.exit(1); }
  const text = readFileSync(file, 'utf8');
  if (args.includes('--selftest')) {
    const failures = selftest(text);
    if (failures.length) { console.error('check-catalog selftest: FAIL'); failures.forEach(f => console.error(' - ' + f)); process.exit(1); }
    console.log('check-catalog selftest: OK (20 known-bad shapes rejected)'); process.exit(0);
  }
  let cat;
  try { cat = parseYamlSubset(text); } catch (e) { console.error(`check-catalog: FAIL\n - ${e.message}`); process.exit(1); }
  const { problems, warnings, count } = validateCatalog(cat);
  for (const w of warnings) console.log(` ! ${w}`);
  if (problems.length) { console.error('check-catalog: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
  console.log(`check-catalog: OK (${count} sources, ${warnings.length} placeholder warnings)`);
}
