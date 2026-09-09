#!/usr/bin/env node
// Boundary check (ADR-0001; table in docs/architecture.md §2). A package may import only the packages in its row.
//   node tool/check-boundaries.mjs            walks packages/*/src, exit 1 on any forbidden @falens/* import
//   node tool/check-boundaries.mjs selftest   runs the check on a temp tree and asserts the contract
// Zero dependencies on purpose: the gate runs on a fresh clone before `pnpm install`.
import { readdirSync, readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const here = realpathSync(fileURLToPath(import.meta.url));
const root = resolve(dirname(here), '..');

// Copied from docs/architecture.md §2 ("Depends on" column). Keep the two in sync; the table is the decision.
export const ALLOWED = {
  kernel: [],
  adapters: ['kernel'],
  control: ['kernel'],
  service: ['kernel', 'control', 'adapters'],
  api: ['service'],
  worker: ['service', 'adapters'],
  mcp: ['service'],
  cli: ['service', 'api'],
  web: ['api'],
  ui: [],
};

const SPEC_RE = /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;

export function sourceFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') sourceFiles(p, out); }
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

export function specifiers(text) {
  const out = [];
  for (const m of text.matchAll(SPEC_RE)) {
    const spec = m[1] || m[2] || m[3];
    out.push({ spec, line: text.slice(0, m.index).split('\n').length });
  }
  return out;
}

export function checkBoundaries(rootDir) {
  const pk = join(rootDir, 'packages');
  const problems = [];
  if (!existsSync(pk)) return problems;
  for (const name of readdirSync(pk, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()) {
    const src = join(pk, name, 'src');
    if (!existsSync(src)) continue;
    const allowed = ALLOWED[name];
    if (!allowed) { problems.push(`${name}: not in the dependency table of docs/architecture.md §2; add the row (and this script's copy) before adding the package`); continue; }
    for (const f of sourceFiles(src)) {
      for (const { spec, line } of specifiers(readFileSync(f, 'utf8'))) {
        const m = spec.match(/^@falens\/([a-z-]+)/);
        if (!m || m[1] === name) continue;
        if (!allowed.includes(m[1])) problems.push(`${name} → ${m[1]} is not allowed (${relative(rootDir, f)}:${line})`);
      }
    }
  }
  return problems;
}

export function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'falens-bounds-'));
  const results = [];
  const test = (name, fn) => { try { fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name}\n     ${String(e.message).split('\n')[0]}`); } };
  const put = (pkg, file, text) => { mkdirSync(join(dir, 'packages', pkg, 'src'), { recursive: true }); writeFileSync(join(dir, 'packages', pkg, 'src', file), text); };
  try {
    put('kernel', 'index.ts', "import { z } from 'zod';\nimport { readFileSync } from 'node:fs';\nexport const PACKAGE = 'kernel';\n");
    put('api', 'index.ts', "import { runs } from '@falens/service';\nimport type { Adapter } from '@falens/adapters';\nexport { runs };\n");
    put('worker', 'index.ts', "import '@falens/adapters';\nexport * from '@falens/service';\nconst k = await import('@falens/kernel');\n");
    put('web', 'app.tsx', "import type { Contract } from '@falens/api/contract';\nimport { db } from '@falens/control';\n");
    put('service', 'index.ts', "import {\n  flows,\n} from '@falens/kernel';\nimport '@falens/control';\nimport '@falens/adapters';\n");
    test('clean packages produce no problems (third-party and node: imports ignored)', () => {
      const p = checkBoundaries(dir).filter(x => x.startsWith('kernel') || x.startsWith('service'));
      assert.deepEqual(p, []);
    });
    test('api → adapters is flagged with file and line, even as a type import', () => {
      const p = checkBoundaries(dir).filter(x => x.startsWith('api'));
      assert.deepEqual(p, ['api → adapters is not allowed (packages/api/src/index.ts:2)']);
    });
    test('worker → kernel via dynamic import is flagged; worker → adapters and service are allowed', () => {
      const p = checkBoundaries(dir).filter(x => x.startsWith('worker'));
      assert.deepEqual(p, ['worker → kernel is not allowed (packages/worker/src/index.ts:3)']);
    });
    test('web may import only @falens/api; web → control is flagged', () => {
      const p = checkBoundaries(dir).filter(x => x.startsWith('web'));
      assert.deepEqual(p, ['web → control is not allowed (packages/web/src/app.tsx:2)']);
    });
    test('kernel importing another @falens package is flagged', () => {
      put('kernel', 'bad.ts', "export * from '@falens/adapters';\n");
      const p = checkBoundaries(dir).filter(x => x.startsWith('kernel'));
      assert.deepEqual(p, ['kernel → adapters is not allowed (packages/kernel/src/bad.ts:1)']);
    });
    test('a package missing from the table is flagged', () => {
      put('rogue', 'index.ts', "export const x = 1;\n");
      assert.ok(checkBoundaries(dir).some(x => x.startsWith('rogue: not in the dependency table')));
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return results;
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === here) {
  if (process.argv[2] === 'selftest') {
    const results = selftest();
    for (const l of results) console.log(l);
    const failing = results.filter(l => l.startsWith('FAIL')).length;
    if (failing) { console.log(`\ncheck-boundaries selftest: ${failing} failing`); process.exit(1); }
    console.log(`\ncheck-boundaries selftest: OK (${results.length} checks)`); process.exit(0);
  }
  const problems = checkBoundaries(root);
  if (problems.length) { console.error('check-boundaries: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
  console.log(`check-boundaries: OK (${Object.keys(ALLOWED).length} packages in the table)`);
}
