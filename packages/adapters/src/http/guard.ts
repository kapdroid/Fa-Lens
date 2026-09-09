// The two refusals that happen before any socket is opened.
import type { ResolvedStep } from '../adapter.ts';

export interface Refusal { verdict: string; host: string }

/** Undefined when the call is allowed; otherwise the plain-words reason it was not. */
export function refuse(step: ResolvedStep): Refusal | undefined {
  let host: string;
  try { host = new URL(step.url).host; } catch { return { verdict: 'BLOCKED · not a usable url', host: '' }; }

  const base = step.server.baseUrl;
  const allowedHost = base ? safeHost(base) : undefined;
  if (!allowedHost || host !== allowedHost) return { verdict: 'BLOCKED · host not in the catalog', host };

  const methods = step.server.methods.map(m => m.toUpperCase());
  if (!methods.includes(step.method.toUpperCase())) return { verdict: 'BLOCKED · method not allowed', host };
  return undefined;
}

function safeHost(url: string): string | undefined {
  try { return new URL(url).host; } catch { return undefined; }
}
