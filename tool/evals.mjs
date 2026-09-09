#!/usr/bin/env node
// Harness-eval ledger (docs/orchestration/evals.jsonl → docs/orchestration/evals.md).
//   node tool/evals.mjs record <id> <verdict> <note…> [--date=YYYY-MM-DD] [--sha=abc1234]
//       → appends one line {"id","verdict","note","date","sha"} to evals.jsonl (date: today, sha: git HEAD)
//   node tool/evals.mjs render [--check]
//       → rewrites the table between <!-- results:start --> and <!-- results:end --> in evals.md from the jsonl;
//         everything outside the markers is left as is; --check exits 1 without writing when the table is stale
//   node tool/evals.mjs selftest
//       → runs record and render in a temp dir and asserts the contract above (never touches the real ledger)
// Zero dependencies on purpose: the gate runs on a fresh clone before `pnpm install` (same rule as tool/lib).
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const here = realpathSync(fileURLToPath(import.meta.url));
const root = resolve(dirname(here), '..');
const DEFAULT_DIR = join(root, 'docs/orchestration');
export const VERDICTS = ['pass', 'fail', 'blocked'];
export const START = '<!-- results:start -->';
export const END = '<!-- results:end -->';
const ID_RE = /^[UE]-\d{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ['id', 'verdict', 'note', 'date', 'sha'];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const headSha = () => { try { return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null; } catch { return null; } };

// Append one row. Validation happens before anything is written, so a rejected row leaves the ledger untouched.
export function record(dir, { id, verdict, note, date, sha }) {
  if (!ID_RE.test(id || '')) throw new Error(`id must look like U-012 or E-001 (got "${id ?? ''}")`);
  if (!VERDICTS.includes(verdict)) throw new Error(`verdict must be one of ${VERDICTS.join(', ')} (got "${verdict ?? ''}")`);
  if (typeof note !== 'string' || !note.trim()) throw new Error('note must not be empty');
  if (date !== undefined && !DATE_RE.test(String(date))) throw new Error(`date must be YYYY-MM-DD (got "${date}")`);
  if (sha !== undefined && sha !== null && !/^[0-9a-f]{7,40}$/.test(String(sha))) throw new Error(`sha must be a hex commit id (got "${sha}")`);
  const row = { id, verdict, note: note.trim(), date: date ?? today(), sha: sha ?? headSha() };
  appendFileSync(join(dir, 'evals.jsonl'), JSON.stringify(row) + '\n');
  return row;
}

// Read every row in ledger order. A malformed line is an error that names the line; the renderer never guesses.
export function readLedger(dir) {
  const p = join(dir, 'evals.jsonl');
  if (!existsSync(p)) return [];
  const rows = [];
  readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let row;
    try { row = JSON.parse(line); } catch (e) { throw new Error(`evals.jsonl line ${i + 1}: not JSON (${e.message})`); }
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`evals.jsonl line ${i + 1}: not an object`);
    for (const k of FIELDS) if (!(k in row)) throw new Error(`evals.jsonl line ${i + 1}: missing "${k}"`);
    if (!VERDICTS.includes(row.verdict)) throw new Error(`evals.jsonl line ${i + 1}: verdict "${row.verdict}" is not one of ${VERDICTS.join(', ')}`);
    rows.push(row);
  });
  return rows;
}

const cell = (v) => { const s = String(v ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim(); return s || '—'; };

export function renderTable(rows) {
  const lines = ['| Date | Unit | Harness verdict | SHA | Note |', '|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${cell(r.date)} | ${cell(r.id)} | ${cell(r.verdict)} | ${cell(r.sha)} | ${cell(r.note)} |`);
  return lines.join('\n');
}

// Replace only the region between the markers; the file keeps its prose and ends with exactly one newline.
export function render(dir, { check = false } = {}) {
  const p = join(dir, 'evals.md');
  if (!existsSync(p)) throw new Error(`${p} does not exist`);
  const text = readFileSync(p, 'utf8');
  const a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error(`evals.md: markers ${START} … ${END} not found in that order`);
  const rows = readLedger(dir);
  const next = text.slice(0, a + START.length) + '\n' + renderTable(rows) + '\n' + text.slice(b).replace(/\s*$/, '\n');
  const changed = next !== text;
  if (changed && !check) writeFileSync(p, next);
  return { changed, rows: rows.length };
}

// Self-test in a temp dir: the contract the DoD names, red before the implementation exists, green after.
export function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'falens-evals-'));
  const results = [];
  const test = (name, fn) => { try { fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name}\n     ${String(e.message).split('\n')[0]}`); } };
  const md = () => readFileSync(join(dir, 'evals.md'), 'utf8');
  try {
    writeFileSync(join(dir, 'evals.md'), '# Harness evals\n\nprose above\n\n<!-- results:start -->\nold table\n<!-- results:end -->\n\nprose below\n');
    test('record appends one JSON line with id, verdict, note, date, sha in that order', () => {
      record(dir, { id: 'E-001', verdict: 'pass', note: 'gate green, note present', date: '2026-09-09', sha: 'abc1234' });
      const lines = readFileSync(join(dir, 'evals.jsonl'), 'utf8').split('\n');
      assert.equal(lines.length, 2, 'one line plus the terminating newline');
      assert.equal(lines[1], '');
      assert.deepEqual(JSON.parse(lines[0]), { id: 'E-001', verdict: 'pass', note: 'gate green, note present', date: '2026-09-09', sha: 'abc1234' });
      assert.deepEqual(Object.keys(JSON.parse(lines[0])), FIELDS);
    });
    test('record defaults the date to today and keeps ledger order', () => {
      const row = record(dir, { id: 'E-002', verdict: 'blocked', note: 'a | pipe', sha: 'deadbee' });
      assert.match(row.date, DATE_RE);
      assert.deepEqual(readLedger(dir).map(r => r.id), ['E-001', 'E-002']);
    });
    test('record rejects a bad verdict, a bad id, an empty note; nothing is written', () => {
      assert.throws(() => record(dir, { id: 'E-003', verdict: 'maybe', note: 'x' }), /verdict must be one of/);
      assert.throws(() => record(dir, { id: 'nope', verdict: 'pass', note: 'x' }), /id must look like/);
      assert.throws(() => record(dir, { id: 'E-003', verdict: 'pass', note: '  ' }), /note must not be empty/);
      assert.equal(readLedger(dir).length, 2);
    });
    test('render writes the table between the markers and leaves the prose byte-identical', () => {
      assert.equal(render(dir).changed, true);
      const out = md();
      assert.ok(out.startsWith('# Harness evals\n\nprose above\n\n<!-- results:start -->\n'), 'prose above untouched');
      assert.ok(out.endsWith('<!-- results:end -->\n\nprose below\n'), 'prose below untouched, single trailing newline');
      assert.ok(!out.includes('old table'), 'old table replaced');
      assert.ok(out.includes('| Date | Unit | Harness verdict | SHA | Note |\n|---|---|---|---|---|\n'), 'header present');
      assert.ok(out.includes('| 2026-09-09 | E-001 | pass | abc1234 | gate green, note present |'), 'row rendered');
      assert.ok(out.includes('| a \\| pipe |'), 'pipes in notes are escaped');
    });
    test('render twice changes nothing (idempotent) and --check agrees', () => {
      const before = md();
      assert.equal(render(dir).changed, false);
      assert.equal(md(), before);
      assert.equal(render(dir, { check: true }).changed, false);
    });
    test('render --check reports a stale table without writing', () => {
      record(dir, { id: 'E-003', verdict: 'fail', note: 'x', sha: '1111111' });
      const before = md();
      assert.equal(render(dir, { check: true }).changed, true);
      assert.equal(md(), before);
      assert.equal(render(dir).changed, true);
    });
    test('render names a malformed jsonl line', () => {
      appendFileSync(join(dir, 'evals.jsonl'), '{not json\n');
      assert.throws(() => render(dir), /evals\.jsonl line 4: not JSON/);
    });
    test('render fails when a marker is missing', () => {
      writeFileSync(join(dir, 'evals.jsonl'), '');
      writeFileSync(join(dir, 'evals.md'), '# no markers\n');
      assert.throws(() => render(dir), /markers/);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return results;
}

function usage(code) {
  console.error('usage: node tool/evals.mjs record <id> <pass|fail|blocked> <note…> [--date=YYYY-MM-DD] [--sha=abc1234]\n       node tool/evals.mjs render [--check]\n       node tool/evals.mjs selftest');
  process.exit(code);
}
function parseArgs(argv) {
  const args = [], opts = {};
  for (const a of argv) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opts[m[1]] = m[2] ?? true; else args.push(a); }
  return { args, opts };
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === here) {
  const { args, opts } = parseArgs(process.argv.slice(2));
  const cmd = args.shift();
  try {
    if (cmd === 'record') {
      const [id, verdict, ...rest] = args;
      if (!id || !verdict || !rest.length) usage(2);
      const row = record(DEFAULT_DIR, { id, verdict, note: rest.join(' '), date: opts.date, sha: opts.sha });
      console.log(`evals: recorded ${row.id} ${row.verdict} (${row.date}, ${row.sha ?? '—'}) → docs/orchestration/evals.jsonl`);
    } else if (cmd === 'render') {
      const r = render(DEFAULT_DIR, { check: Boolean(opts.check) });
      if (opts.check) { console.log(r.changed ? 'evals: docs/orchestration/evals.md is stale — run node tool/evals.mjs render' : `evals: docs/orchestration/evals.md is up to date (${r.rows} rows)`); process.exit(r.changed ? 1 : 0); }
      console.log(`evals: ${r.changed ? 'rendered' : 'unchanged'} docs/orchestration/evals.md (${r.rows} rows)`);
    } else if (cmd === 'selftest') {
      const results = selftest();
      for (const l of results) console.log(l);
      const failing = results.filter(l => l.startsWith('FAIL')).length;
      if (failing) { console.log(`\nevals selftest: ${failing} failing`); process.exit(1); }
      console.log(`\nevals selftest: OK (${results.length} checks)`);
    } else usage(cmd ? 1 : 2);
  } catch (e) { console.error(`evals: ${e.message}`); process.exit(1); }
}
