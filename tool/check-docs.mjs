#!/usr/bin/env node
// Documentation gate. Fails (exit 1) on:
//  - ADR files not listed in docs/adr/README.md, or listed but missing
//  - ADR missing a required section
//  - broken relative markdown links anywhere under docs/ or in root README/CLAUDE/AGENTS
//  - invalid JSON in docs/design/tokens.json
//  - CLAUDE.md longer than 80 lines (it must stay small; details live in linked docs)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const problems = [];
const note = (m) => problems.push(m);

// 1. ADR index consistency
const adrDir = join(root, 'docs/adr');
const adrFiles = readdirSync(adrDir).filter(f => /^\d{4}-.*\.md$/.test(f)).sort();
const adrIndex = readFileSync(join(adrDir, 'README.md'), 'utf8');
for (const f of adrFiles) {
  if (!adrIndex.includes(`(${f})`)) note(`ADR not in index: docs/adr/${f}`);
  const text = readFileSync(join(adrDir, f), 'utf8');
  for (const sec of ['## Context', '## Decision', '## Alternatives considered', '## Consequences', '## How we verify']) {
    if (!text.includes(sec)) note(`ADR ${f} missing section "${sec}"`);
  }
  if (!/^Status: (proposed|accepted|superseded by ADR-\d{4})/m.test(text)) note(`ADR ${f} missing/invalid Status line`);
}
for (const m of adrIndex.matchAll(/\]\((\d{4}-[^)]+\.md)\)/g)) {
  if (!adrFiles.includes(m[1])) note(`ADR index links to missing file: ${m[1]}`);
}

// 2. Relative markdown links resolve
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === 'node_modules' || e === '.git' || e === 'prototype') continue;
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}
const mdFiles = [...walk(join(root, 'docs')), ...['README.md', 'CLAUDE.md', 'AGENTS.md'].map(f => join(root, f)).filter(existsSync)];
for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|vault:|#)/.test(target)) continue;
    const abs = resolve(dirname(file), target);
    if (!existsSync(abs)) note(`broken link in ${file.replace(root + '/', '')}: ${target}`);
  }
}

// 3. tokens.json valid
try { JSON.parse(readFileSync(join(root, 'docs/design/tokens.json'), 'utf8')); }
catch (e) { note(`docs/design/tokens.json invalid JSON: ${e.message}`); }

// 4. CLAUDE.md size budget
const claudeMd = join(root, 'CLAUDE.md');
if (existsSync(claudeMd)) {
  const lines = readFileSync(claudeMd, 'utf8').split('\n').length;
  if (lines > 80) note(`CLAUDE.md is ${lines} lines; budget is 80. Move detail into docs/ and link it.`);
}

if (problems.length) { console.error('check-docs: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
console.log(`check-docs: OK (${adrFiles.length} ADRs, ${mdFiles.length} markdown files)`);
