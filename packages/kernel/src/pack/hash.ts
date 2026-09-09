import type { Pack } from './types.ts';

/** Canonical JSON: object keys sorted recursively, arrays in order, so the same content always serialises the same way. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Content hash the registry stores at publish (ADR-0010). SHA-256 over the canonical parsed pack; Web Crypto so it also runs in a browser. */
export async function hashPack(pack: Pack): Promise<string> {
  const files = [...pack.files].sort((a, b) => a.path.localeCompare(b.path)).map(f => ({ path: f.path, kind: f.kind, doc: f.doc }));
  const bytes = new TextEncoder().encode(canonicalJson({ manifest: pack.manifest, files }));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
