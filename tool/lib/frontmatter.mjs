// Minimal YAML-frontmatter reader for markdown files. Zero dependencies on purpose:
// the gate must run on a fresh clone before `pnpm install`.
// Supports: `key: value`, `key: [a, b]`, and block lists:
//   key:
//     - item
// Values are strings unless they look like ints/bools. Nested maps are NOT supported (keep unit files flat).
import { readFileSync } from 'node:fs';

export function readFrontmatter(path) {
  const text = readFileSync(path, 'utf8');
  if (!text.startsWith('---\n')) return { data: null, body: text, error: 'missing frontmatter (file must start with ---)' };
  const end = text.indexOf('\n---', 4);
  if (end < 0) return { data: null, body: text, error: 'unterminated frontmatter' };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, '');
  const data = {};
  let currentList = null;
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentList) { data[currentList].push(coerce(listItem[1])); continue; }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) return { data: null, body, error: `cannot parse line: ${line}` };
    const [, key, value] = kv;
    if (value === '') { data[key] = []; currentList = key; continue; }
    currentList = null;
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(coerce);
    } else data[key] = coerce(value);
  }
  return { data, body, error: null };
}

function coerce(v) {
  const s = String(v).trim().replace(/^["']|["']$/g, '');
  if (/^-?\d+$/.test(s)) return Number(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}
