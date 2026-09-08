#!/usr/bin/env node
// Harness gate: agents, skills, rules, hooks, settings are well-formed and consistent with each other and the docs.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { readFrontmatter } from './lib/frontmatter.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const problems = [];
const note = (m) => problems.push(m);
const MODELS = new Set(['sonnet', 'opus', 'haiku', 'fable', 'inherit']);

// agents
const agentsDir = join(root, '.claude/agents');
const agents = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md')) : [];
for (const f of agents) {
  const { data, body, error } = readFrontmatter(join(agentsDir, f));
  if (error) { note(`agent ${f}: ${error}`); continue; }
  if (data.name !== basename(f, '.md')) note(`agent ${f}: name "${data.name}" must equal filename`);
  if (!data.description || String(data.description).length < 40) note(`agent ${f}: description missing or too short`);
  if (String(data.description).length > 1024) note(`agent ${f}: description over 1024 chars`);
  if (!data.tools) note(`agent ${f}: tools allow-list missing`);
  const tools = Array.isArray(data.tools) ? data.tools : String(data.tools).split(',').map(s => s.trim());
  if (tools.includes('Agent')) note(`agent ${f}: must not have the Agent tool (no spawning)`);
  if (data.model && !MODELS.has(String(data.model)) && !/^claude-/.test(String(data.model))) note(`agent ${f}: unknown model "${data.model}"`);
  if (!data.maxTurns) note(`agent ${f}: maxTurns missing`);
  if (body.trim().length < 200) note(`agent ${f}: body too short to be a rubric`);
  if (/\b(CRITICAL|MUST|NEVER)\b/.test(body)) note(`agent ${f}: shouting words (CRITICAL/MUST/NEVER) — explain why instead (best-practices §3)`);
}
const expectedAgents = ['explorer', 'spec-checker', 'evidence-collector', 'adr-reviewer', 'design-reviewer', 'adapter-safety-reviewer', 'fresh-eyes', 'memory-scribe'];
for (const a of expectedAgents) if (!agents.includes(a + '.md')) note(`agent missing: ${a} (referenced by docs/orchestration.md)`);

// skills
const skillsDir = join(root, '.claude/skills');
const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory()) : [];
for (const d of skills) {
  const p = join(skillsDir, d, 'SKILL.md');
  if (!existsSync(p)) { note(`skill ${d}: SKILL.md missing`); continue; }
  const { data, body, error } = readFrontmatter(p);
  if (error) { note(`skill ${d}: ${error}`); continue; }
  if (data.name !== d) note(`skill ${d}: name "${data.name}" must equal directory`);
  if (!data.description || !/\bUse when\b/.test(String(data.description))) note(`skill ${d}: description needs a "Use when…" trigger phrase`);
  if (/\b(I can|I will|I'll)\b/.test(String(data.description))) note(`skill ${d}: description must be third person`);
  if (String(data.description).length > 1024) note(`skill ${d}: description over 1024 chars`);
  const lines = body.split('\n').length; if (lines > 500) note(`skill ${d}: SKILL.md body ${lines} lines (> 500)`);
  for (const m of body.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/scripts\/([\w.-]+)/g)) {
    if (!existsSync(join(skillsDir, d, 'scripts', m[1]))) note(`skill ${d}: references missing script scripts/${m[1]}`);
  }
}
for (const s of ['build', 'unit', 'harness-eval']) if (!skills.includes(s)) note(`skill missing: ${s} (referenced by CLAUDE.md)`);

// rules
const rulesDir = join(root, '.claude/rules');
for (const f of existsSync(rulesDir) ? readdirSync(rulesDir) : []) {
  const { data, error } = readFrontmatter(join(rulesDir, f));
  if (error) note(`rule ${f}: ${error}`);
  else if (!Array.isArray(data.paths) || !data.paths.length) note(`rule ${f}: needs a paths: list so it loads just in time`);
}

// settings + hooks
const settingsPath = join(root, '.claude/settings.json');
if (!existsSync(settingsPath)) note('.claude/settings.json missing');
else {
  let s; try { s = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch (e) { note(`settings.json invalid: ${e.message}`); }
  if (s) {
    for (const [event, entries] of Object.entries(s.hooks || {})) for (const entry of entries) for (const h of entry.hooks || []) {
      const args = h.args || [];
      for (const a of args) if (a.includes('${CLAUDE_PROJECT_DIR}')) {
        const p = a.replace('${CLAUDE_PROJECT_DIR}', root);
        if (!existsSync(p)) note(`settings.json ${event}: hook script missing ${a}`);
        else if (!(statSync(p).mode & 0o111)) note(`settings.json ${event}: hook script not executable ${a}`);
      }
    }
    if (s.permissions?.defaultMode !== 'plan') note('settings.json: permissions.defaultMode should be "plan" (docs/orchestration.md §5)');
  }
}

// constitution wiring
const claude = join(root, 'CLAUDE.md'), agentsMd = join(root, 'AGENTS.md');
if (!existsSync(agentsMd)) note('AGENTS.md missing');
if (!existsSync(claude)) note('CLAUDE.md missing'); else if (!readFileSync(claude, 'utf8').startsWith('@AGENTS.md')) note('CLAUDE.md must start with @AGENTS.md');
for (const f of ['tool/githooks/pre-commit', 'tool/githooks/pre-push', 'tool/gate.sh', 'tool/wt.sh', 'tool/setup.sh']) {
  const p = join(root, f); if (!existsSync(p)) note(`missing ${f}`); else if (!(statSync(p).mode & 0o111)) note(`${f} not executable`);
}
for (const f of ['docs/orchestration.md', 'docs/orchestration/best-practices.md', 'docs/orchestration/evals.md', 'docs/plan/README.md', '.github/PULL_REQUEST_TEMPLATE.md']) if (!existsSync(join(root, f))) note(`missing ${f}`);

if (problems.length) { console.error('check-harness: FAIL'); for (const p of problems) console.error(' - ' + p); process.exit(1); }
console.log(`check-harness: OK (${agents.length} agents, ${skills.length} skills)`);
