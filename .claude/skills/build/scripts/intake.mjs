#!/usr/bin/env node
// Intake for /build. Prints a compact brief or "INTAKE FAILED: <reason>" (exit 1).
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const id = (process.argv[2] || '').trim();
const fail = (m) => { console.log(`INTAKE FAILED: ${m}`); process.exit(1); };
if (!/^[UE]-\d{3}$/.test(id)) fail(`unit id must look like U-012 or E-001 (got "${id || 'nothing'}")`);

const root = resolve(execSync('git rev-parse --show-toplevel').toString().trim());
const { readFrontmatter } = await import(join(root, 'tool/lib/frontmatter.mjs'));
const dir = join(root, 'docs/plan/units');
const file = readdirSync(dir).find(f => f.startsWith(id));
if (!file) fail(`no unit file for ${id} in docs/plan/units`);
try { execSync(`node ${join(root, 'tool/check-units.mjs')}`, { stdio: 'pipe' }); } catch (e) { fail(`check-units red:\n${e.stdout}`); }

const { data, body } = readFrontmatter(join(dir, file));
if (!['ready', 'in_progress'].includes(data.status)) fail(`status is "${data.status}"; only a human sets ready`);
// A dependency is done when its unit file says so, or when its unit branch is already merged into origin/main:
// the status field is edited by hand and lags the merge; the merge is the fact (found by the E-005 eval).
const merged = (dep) => { try { execSync(`git merge-base --is-ancestor origin/unit/${dep} origin/main`, { cwd: root, stdio: 'pipe' }); return true; } catch { return false; } };
const depNotes = [];
for (const dep of data.depends_on || []) {
  const df = readdirSync(dir).find(f => f.startsWith(dep));
  const st = df ? readFrontmatter(join(dir, df)).data.status : 'missing';
  if (st === 'done') continue;
  if (st === 'review' && merged(dep)) { depNotes.push(`dependency ${dep} is "review" but unit/${dep} is merged into origin/main → treated as done (flip its status to done in the next housekeeping commit)`); continue; }
  fail(`dependency ${dep} is ${st}, needs done`);
}
const progress = body.split('## Progress')[1]?.trim().split('\n').filter(Boolean) ?? [];
const last = progress.at(-1) || '(none) → start at state 0';
const scope = (body.split('## Scope')[1] || '').split('##')[0].trim();
const out = (body.split('## Out of scope')[1] || '').split('##')[0].trim();

console.log(`UNIT ${data.id} · ${data.title}
tier ${data.tier} · kind ${data.kind} · estimate ${data.estimate || '?'} · status ${data.status}
file docs/plan/units/${file}
adrs ${(data.adrs || []).join(', ')}${data.design?.length ? `\ndesign ${data.design.join(', ')}` : ''}
allowed_files:
${(data.allowed_files || []).map(f => '  - ' + f).join('\n')}
dod:
${(data.dod || []).map((d, i) => `  ${i + 1}. ${d}`).join('\n')}
scope: ${scope.replace(/\s+/g, ' ').slice(0, 600)}
out of scope: ${out.replace(/\s+/g, ' ').slice(0, 300)}
resume point: ${last}
${depNotes.length ? depNotes.map(n => 'note: ' + n).join('\n') + '\n' : ''}checkpoints: ${data.tier >= 2 ? 'plan approval required before code' : 'PR only'}${data.tier === 3 ? '; adapter-safety-reviewer + fresh-eyes mandatory' : ''}`);
