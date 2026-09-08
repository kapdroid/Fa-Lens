#!/usr/bin/env node
// Zero-dependency test for tool/check-units.mjs. Run: node tool/test/check-units.test.mjs
// Asserts: clean tree → exit 0; an evidence/ directory with no matching unit → exit 1 and named in the output.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const checker = join(root, 'tool/check-units.mjs');
const run = () => spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
const orphan = join(root, 'evidence/X-999');
let failures = 0;
const test = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`); } };

test('clean tree: check-units exits 0', () => {
  assert.ok(!existsSync(orphan), 'precondition: evidence/X-999 must not exist before the test');
  const r = run();
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
});

test('orphan evidence dir: check-units exits 1 and names it', () => {
  mkdirSync(orphan, { recursive: true });
  writeFileSync(join(orphan, 'placeholder.log'), 'orphan\n');
  try {
    const r = run();
    assert.equal(r.status, 1, `expected exit 1 for orphan evidence dir, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.match(r.stderr, /evidence\/X-999/, 'stderr should name the orphan directory');
  } finally {
    rmSync(orphan, { recursive: true, force: true });
  }
});

test('cleanup: evidence/X-999 removed', () => { assert.ok(!existsSync(orphan)); });

if (failures) { console.log(`\n${failures} failing`); process.exit(1); }
console.log('\nall passing');
