#!/usr/bin/env node
// Knowledge index generator (docs/knowledge/<area>/*.md → docs/knowledge/README.md).
//   node tool/knowledge-index.mjs            rewrites the section between <!-- index:start --> and <!-- index:end -->
//   node tool/knowledge-index.mjs --check    exits 1 without writing when the committed index is stale (gate stage)
//   node tool/knowledge-index.mjs selftest   runs the generator in a temp dir and asserts the contract
// Each note is one file whose first line is a `# ` heading; the heading is the index description. Grouped by area
// (the subfolder), areas and files sorted, so parallel units never edit the same index lines by hand again.
// Zero dependencies on purpose: the gate runs on a fresh clone before `pnpm install`.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, rmSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const here = realpathSync(fileURLToPath(import.meta.url));
const root = resolve(dirname(here), '..');
const DEFAULT_DIR = join(root, 'docs/knowledge');
export const START = '<!-- index:start -->';
export const END = '<!-- index:end -->';

// Every docs/knowledge/<area>/<slug>.md with its first heading. A note without a first-line `# ` heading is an error.
export function listNotes(dir) {
  const areas = readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
  const out = [];
  for (const area of areas) {
    const files = readdirSync(join(dir, area)).filter(f => f.endsWith('.md')).sort();
    for (const f of files) {
      const first = readFileSync(join(dir, area, f), 'utf8').split('\n')[0] || '';
      const m = first.match(/^# (.+\S)\s*$/);
      if (!m) throw new Error(`${area}/${f}: first line must be a "# " heading (got "${first.slice(0, 60)}")`);
      out.push({ area, file: f, title: m[1] });
    }
  }
  return out;
}

export function renderIndex(notes) {
  const lines = [];
  let area = null;
  for (const n of notes) {
    if (n.area !== area) { if (area !== null) lines.push(''); lines.push(`### ${n.area}`, ''); area = n.area; }
    lines.push(`- [${n.title.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}](${n.area}/${n.file})`);
  }
  return lines.join('\n');
}

// Replace only the region between the markers; prose outside stays byte-identical; file ends with one newline.
export function generate(dir, { check = false } = {}) {
  const p = join(dir, 'README.md');
  if (!existsSync(p)) throw new Error(`${p} does not exist`);
  const text = readFileSync(p, 'utf8');
  const a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error(`README.md: markers ${START} … ${END} not found in that order`);
  const notes = listNotes(dir);
  const next = text.slice(0, a + START.length) + '\n' + renderIndex(notes) + '\n' + text.slice(b).replace(/\s*$/, '\n');
  const changed = next !== text;
  if (changed && !check) writeFileSync(p, next);
  return { changed, notes: notes.length };
}

export function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'falens-kidx-'));
  const results = [];
  const test = (name, fn) => { try { fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name}\n     ${String(e.message).split('\n')[0]}`); } };
  const readme = () => readFileSync(join(dir, 'README.md'), 'utf8');
  try {
    mkdirSync(join(dir, 'harness')); mkdirSync(join(dir, 'design'));
    writeFileSync(join(dir, 'harness', 'b-note.md'), '# Second harness lesson\n\nbody\n');
    writeFileSync(join(dir, 'harness', 'a-note.md'), '# First harness lesson\n\nbody\n');
    writeFileSync(join(dir, 'design', 'one.md'), '# One primary [button] per screen\n\nbody\n');
    writeFileSync(join(dir, 'README.md'), '# Knowledge\n\nprose above\n\n## Index\n\n<!-- index:start -->\n- old hand-written row\n<!-- index:end -->\n\nprose below\n');
    test('generate lists every note under a ### area heading, areas and files sorted, title = first heading', () => {
      assert.equal(generate(dir).changed, true);
      const out = readme();
      assert.ok(out.includes('<!-- index:start -->\n### design\n\n- [One primary \\[button\\] per screen](design/one.md)\n\n### harness\n\n- [First harness lesson](harness/a-note.md)\n- [Second harness lesson](harness/b-note.md)\n<!-- index:end -->'), out);
      assert.ok(!out.includes('old hand-written row'));
    });
    test('prose outside the markers is byte-identical and the file ends with one newline', () => {
      const out = readme();
      assert.ok(out.startsWith('# Knowledge\n\nprose above\n\n## Index\n\n<!-- index:start -->\n'));
      assert.ok(out.endsWith('<!-- index:end -->\n\nprose below\n'));
    });
    test('running it twice changes nothing and --check agrees', () => {
      const before = readme();
      assert.equal(generate(dir).changed, false);
      assert.equal(readme(), before);
      assert.equal(generate(dir, { check: true }).changed, false);
    });
    test('--check reports a stale index without writing', () => {
      writeFileSync(join(dir, 'design', 'two.md'), '# Two\n');
      const before = readme();
      assert.equal(generate(dir, { check: true }).changed, true);
      assert.equal(readme(), before);
      assert.equal(generate(dir).changed, true);
      assert.ok(readme().includes('- [Two](design/two.md)'));
    });
    test('a note without a first-line # heading fails naming the file', () => {
      writeFileSync(join(dir, 'design', 'bad.md'), 'no heading here\n');
      assert.throws(() => generate(dir), /design\/bad\.md: first line must be a "# " heading/);
      rmSync(join(dir, 'design', 'bad.md'));
    });
    test('missing markers fail', () => {
      writeFileSync(join(dir, 'README.md'), '# no markers\n');
      assert.throws(() => generate(dir), /markers/);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return results;
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === here) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === 'selftest') {
      const results = selftest();
      for (const l of results) console.log(l);
      const failing = results.filter(l => l.startsWith('FAIL')).length;
      if (failing) { console.log(`\nknowledge-index selftest: ${failing} failing`); process.exit(1); }
      console.log(`\nknowledge-index selftest: OK (${results.length} checks)`);
    } else if (args.length === 0 || (args.length === 1 && args[0] === '--check')) {
      const check = args[0] === '--check';
      const r = generate(DEFAULT_DIR, { check });
      if (check) { console.log(r.changed ? 'knowledge-index: docs/knowledge/README.md index is stale — run node tool/knowledge-index.mjs' : `knowledge-index: up to date (${r.notes} notes)`); process.exit(r.changed ? 1 : 0); }
      console.log(`knowledge-index: ${r.changed ? 'rewrote' : 'unchanged'} docs/knowledge/README.md (${r.notes} notes)`);
    } else { console.error('usage: node tool/knowledge-index.mjs [--check] | selftest'); process.exit(2); }
  } catch (e) { console.error(`knowledge-index: ${e.message}`); process.exit(1); }
}
