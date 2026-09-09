// The scope a run is asked for. `scopeHash` is the canonical fingerprint the control plane locks on
// (docs/architecture.md §4). The run key also needs the target (flow | module | company | suite and its id),
// which the service composes: two different flows in one scope must never join the same run.
import { canonicalJson } from '../pack/hash.ts';

export interface Scope {
  env: string;
  tenant: string;
  company: string;
  user: string;
  dateFrom: string;
  dateTo: string;
}

export const SCOPE_KEYS: readonly (keyof Scope)[] = ['env', 'tenant', 'company', 'user', 'dateFrom', 'dateTo'];

/** SHA-256 over the canonical scope. Key order never matters; an unknown key is refused so the input set cannot drift. */
export async function scopeHash(scope: Scope): Promise<string> {
  const unknown = Object.keys(scope).filter(k => !(SCOPE_KEYS as readonly string[]).includes(k));
  if (unknown.length) throw new Error(`scopeHash: unknown key ${unknown.join(', ')}; the scope is ${SCOPE_KEYS.join(', ')}`);
  const ordered: Record<string, unknown> = {};
  for (const k of SCOPE_KEYS) ordered[k] = scope[k];
  const bytes = new TextEncoder().encode(canonicalJson(ordered));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
