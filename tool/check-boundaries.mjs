#!/usr/bin/env node
// Boundary check (ADR-0001; table in docs/architecture.md §2). A package may import only the packages in its row.
//   node tool/check-boundaries.mjs            walks each package's manifest, src and test; exit 1 on any forbidden @falens/* edge
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
    const test = join(pk, name, 'test');
    const manifest = join(pk, name, 'package.json');
    if (!existsSync(src) && !existsSync(test) && !existsSync(manifest)) continue;
    const allowed = ALLOWED[name];
    if (!allowed) { problems.push(`${name}: not in the dependency table of docs/architecture.md §2; add the row (and this script's copy) before adding the package`); continue; }

    // A dependency named in the manifest is an edge whether or not anything imports it yet, and it is the
    // form a reversed layer usually takes first (found the hard way in U-014).
    if (existsSync(manifest)) {
      let pkg = {};
      try { pkg = JSON.parse(readFileSync(manifest, 'utf8')); } catch { problems.push(`${name}: package.json is not readable JSON`); }
      for (const field of ['dependencies', 'devDependencies']) {
        for (const dep of Object.keys(pkg[field] ?? {})) {
          const m = dep.match(/^@falens\/([a-z-]+)/);
          if (!m || m[1] === name) continue;
          if (!allowed.includes(m[1])) problems.push(`${name} → ${m[1]} is not allowed (packages/${name}/package.json)`);
        }
      }
    }

    // Source and tests are held to the same rule: a test that reaches across a boundary drags the
    // package with it, and it is still the package's code.
    for (const dir of [src, test]) {
      if (!existsSync(dir)) continue;
      for (const f of sourceFiles(dir)) {
        for (const { spec, line } of specifiers(readFileSync(f, 'utf8'))) {
          const m = spec.match(/^@falens\/([a-z-]+)/);
          if (!m || m[1] === name) continue;
          if (!allowed.includes(m[1])) problems.push(`${name} → ${m[1]} is not allowed (${relative(rootDir, f)}:${line})`);
        }
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
  const putTest = (pkg, file, text) => { mkdirSync(join(dir, 'packages', pkg, 'test'), { recursive: true }); writeFileSync(join(dir, 'packages', pkg, 'test', file), text); };
  const putManifest = (pkg, deps, devDeps = {}) => {
    mkdirSync(join(dir, 'packages', pkg), { recursive: true });
    writeFileSync(join(dir, 'packages', pkg, 'package.json'), JSON.stringify({ name: `@falens/${pkg}`, dependencies: deps, devDependencies: devDeps }, null, 2));
  };
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
    test('a manifest edge is flagged even when no source file imports it', () => {
      putManifest('control', { '@falens/kernel': 'workspace:*', '@falens/service': 'workspace:*' });
      const p = checkBoundaries(dir).filter(x => x.startsWith('control'));
      assert.deepEqual(p, ['control → service is not allowed (packages/control/package.json)']);
    });

    test('third-party dependencies are not the boundary checker\'s business', () => {
      putManifest('adapters', { '@falens/kernel': 'workspace:*', undici: '^8' }, { vitest: '^3', '@types/pg': '^8' });
      assert.deepEqual(checkBoundaries(dir).filter(x => x.startsWith('adapters')), []);
    });

    test('a forbidden import under test/ is flagged, because a test is code too', () => {
      putTest('ui', 'render.test.ts', "import { runsRepo } from '@falens/control';\n");
      const p = checkBoundaries(dir).filter(x => x.startsWith('ui'));
      assert.deepEqual(p, ['ui → control is not allowed (packages/ui/test/render.test.ts:1)']);
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
