#!/usr/bin/env node
// Usage: node tool/check-allowed.mjs U-012 packages/adapters/src/mssql/guard.ts
// Exit 0 if the path is inside the unit's allowed_files (globs: ** any depth, * one segment), else 1.
// Always allowed besides allowed_files: the unit's own file, evidence/<id>/**, and the memory layer
// (docs/knowledge/**, new ADRs) that memory-scribe writes in state 8.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readFrontmatter } from './lib/frontmatter.mjs';

const [id, rel] = process.argv.slice(2);
if (!id || !rel) { console.error('usage: check-allowed.mjs <unit-id> <repo-relative-path>'); process.exit(2); }
const root = resolve(new URL('..', import.meta.url).pathname);
const dir = join(root, 'docs/plan/units');
const file = readdirSync(dir).find(f => f.startsWith(id));
if (!file) { console.error(`no unit file for ${id}`); process.exit(1); }
const { data } = readFrontmatter(join(dir, file));
const always = [`docs/plan/units/${file}`, `evidence/${id}/**`, 'docs/knowledge/**', 'docs/adr/*.md', 'docs/adr/README.md']; // memory layer written by the loop (evidence, memory-scribe)
const globs = [...(data.allowed_files || []), ...always];

export function globToRegExp(g) {
  let s = g.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\/\*\*$/, '');          // trailing "/**"  → this dir and anything below
  s = s.replace(/\*\*\//g, '');          // "**/"          → any number of leading dirs
  s = s.replace(/\*\*/g, '');            // bare "**"      → anything
  s = s.replace(/\*/g, '[^/]*');               // "*"            → one segment
  s = s.replace(//g, '(?:/.*)?').replace(//g, '(?:.*/)?').replace(//g, '.*');
  return new RegExp('^' + s + '$');
}

const ok = globs.some(g => globToRegExp(g).test(rel));
process.exit(ok ? 0 : 1);
