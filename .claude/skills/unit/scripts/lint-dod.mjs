#!/usr/bin/env node
// Rejects Definition-of-Done items that cannot be checked by a machine or a second person.
// Each item must contain a command/test/artifact signal. Exit 1 lists the offenders.
import { readFrontmatter } from '../../../../tool/lib/frontmatter.mjs';
const file = process.argv[2];
if (!file) { console.error('usage: lint-dod.mjs <unit file>'); process.exit(2); }
const { data, error } = readFrontmatter(file);
if (error) { console.error(error); process.exit(1); }
const signals = /\b(node|pnpm|npm|bash|vitest|playwright|jest|gh |git |curl|exit(s)? (0|1|\d)|passes|fails|exists|contains|returns|renders|lists|declares|appends|regenerates|screenshot|green|red)\b|`[^`]+`/i;
const vague = /\b(works|correct(ly)?|properly|good|clean|nice|robust|handles|as expected|should work)\b/i;
const bad = [];
for (const d of data.dod || []) {
  if (!signals.test(d)) bad.push(`no checkable signal: "${d}"`);
  else if (vague.test(d) && !/`/.test(d)) bad.push(`vague wording, name the check: "${d}"`);
}
if (!(data.dod || []).some(d => /gate/.test(d))) bad.push('add a DoD item for `bash tool/gate.sh` being green');
if (bad.length) { console.error('lint-dod: FAIL'); bad.forEach(b => console.error(' - ' + b)); process.exit(1); }
console.log(`lint-dod: OK (${data.dod.length} items)`);
