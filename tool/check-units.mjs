#!/usr/bin/env node
// Work-unit gate. Every docs/plan/units/U-*.md and E-*.md must have valid frontmatter per docs/plan/unit.schema.json
// and a body with the required headings. Also enforces: allowed_files sets of two `ready`/`in_progress` units never overlap.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readFrontmatter } from './lib/frontmatter.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const dir = join(root, 'docs/plan/units');
const schema = JSON.parse(readFileSync(join(root, 'docs/plan/unit.schema.json'), 'utf8'));
const problems = [];
const units = [];

for (const f of readdirSync(dir).filter(f => /^[UE]-\d{3}.*\.md$/.test(f)).sort()) {
  const path = join(dir, f);
  const { data, body, error } = readFrontmatter(path);
  if (error) { problems.push(`${f}: ${error}`); continue; }
  for (const key of schema.required) if (!(key in data)) problems.push(`${f}: missing "${key}"`);
  for (const [key, spec] of Object.entries(schema.properties)) {
    if (!(key in data)) continue;
    const v = data[key];
    if (Array.isArray(v) && v.length === 0 && spec.type !== 'array') continue; // `owner:` left blank parses as [] → treat as unset
    if (spec.type === 'array' && !Array.isArray(v)) problems.push(`${f}: "${key}" must be a list`);
    if (spec.type === 'string' && typeof v !== 'string') problems.push(`${f}: "${key}" must be a string`);
    if (spec.type === 'integer' && !Number.isInteger(v)) problems.push(`${f}: "${key}" must be an integer`);
    if (spec.enum && !spec.enum.includes(v)) problems.push(`${f}: "${key}" must be one of ${spec.enum.join(', ')}`);
    if (spec.pattern && typeof v === 'string' && !new RegExp(spec.pattern).test(v)) problems.push(`${f}: "${key}" does not match ${spec.pattern}`);
    if (spec.minItems && Array.isArray(v) && v.length < spec.minItems) problems.push(`${f}: "${key}" needs at least ${spec.minItems} item(s)`);
  }
  if (data.id && !f.startsWith(data.id)) problems.push(`${f}: filename must start with id ${data.id}`);
  for (const h of schema['x-required-headings']) if (!body.includes(h)) problems.push(`${f}: body missing heading "${h}"`);
  if (data.allowed_files && data.allowed_files.some(p => p.startsWith('/'))) problems.push(`${f}: allowed_files must be repo-relative`);
  units.push({ f, data });
}

// overlap check between active units
const active = units.filter(u => ['ready', 'in_progress'].includes(u.data.status));
for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
  const a = active[i], b = active[j];
  const overlap = (a.data.allowed_files || []).filter(p => (b.data.allowed_files || []).some(q => p === q || p.startsWith(q.replace(/\*+$/, '')) || q.startsWith(p.replace(/\*+$/, ''))));
  if (overlap.length) problems.push(`${a.f} and ${b.f} are both active and overlap on: ${overlap.join(', ')}`);
}

// dependency existence
const ids = new Set(units.map(u => u.data.id));
for (const u of units) for (const d of (u.data.depends_on || [])) if (!ids.has(d)) problems.push(`${u.f}: depends_on unknown unit ${d}`);

if (problems.length) { console.error('check-units: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
console.log(`check-units: OK (${units.length} units, ${active.length} active)`);
