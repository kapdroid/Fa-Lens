import { parse as parseYaml } from 'yaml';
import type { Pack, PackFile, PackFileKind, Problem } from './types.ts';

const LAYOUT: Array<[RegExp, PackFileKind]> = [
  [/^pack\.yaml$/, 'manifest'],
  [/^flows\/[^/]+\.yaml$/, 'flow'],
  [/^rules\/[^/]+\.yaml$/, 'rule'],
  [/^cases\/[^/]+\.yaml$/, 'case'],
  [/^fixtures\/[^/]+\.json$/, 'fixture'],
  [/^drilldown\.yaml$/, 'drilldown'],
  [/^presets\.yaml$/, 'presets'],
  [/^catalog\.refs\.yaml$/, 'catalogRefs'],
  [/^knowledge\/[^/]+\.md$/, 'knowledge'],
];

export function kindOf(path: string): PackFileKind | null {
  for (const [re, kind] of LAYOUT) if (re.test(path)) return kind;
  return null;
}

/** Turn a { path: text } map into a typed Pack. Never touches the file system; a parse error is a problem, not a throw. */
export function parsePack(files: Record<string, string>): { pack: Pack; problems: Problem[] } {
  const problems: Problem[] = [];
  const out: PackFile[] = [];
  let manifest: Record<string, unknown> | null = null;
  for (const path of Object.keys(files).sort()) {
    const text = files[path] ?? '';
    const kind = kindOf(path);
    if (!kind) { problems.push({ path, message: 'not part of the pack layout (ADR-0010): pack.yaml, flows/*.yaml, rules/*.yaml, cases/*.yaml, fixtures/*.json, drilldown.yaml, presets.yaml, catalog.refs.yaml, knowledge/*.md' }); continue; }
    let doc: unknown = text;
    if (kind !== 'knowledge') {
      try { doc = kind === 'fixture' ? JSON.parse(text) : parseYaml(text); }
      catch (e) { problems.push({ path, message: `cannot parse: ${(e as Error).message.split('\n')[0]}` }); continue; }
    }
    if (kind === 'manifest') manifest = (doc && typeof doc === 'object' && !Array.isArray(doc)) ? doc as Record<string, unknown> : null;
    out.push({ path, kind, doc });
  }
  if (!manifest) problems.push({ path: 'pack.yaml', message: 'missing or not a map: every pack starts with pack.yaml (ADR-0010)' });
  return { pack: { manifest, files: out }, problems };
}
