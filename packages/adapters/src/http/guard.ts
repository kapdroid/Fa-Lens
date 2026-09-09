// Everything that must be refused before a socket is opened. Each refusal answers in plain words,
// because a person reading a run needs to know why a call did not happen.
import type { ResolvedStep } from '../adapter.ts';

export interface Refusal { verdict: string; host: string }

const LOOPBACK = /^(localhost|127(\.\d+){3}|\[::1\]|::1)$/i;

/** Undefined when the call is allowed; otherwise the reason it was not. */
export function refuse(step: ResolvedStep): Refusal | undefined {
  let url: URL;
  try { url = new URL(step.url); } catch { return { verdict: 'BLOCKED · not a usable url', host: '' }; }
  const host = url.host;

  let base: URL | undefined;
  try { base = step.server.baseUrl ? new URL(step.server.baseUrl) : undefined; } catch { base = undefined; }

  // Origin, not host: a scheme comparison is the difference between a bearer token over TLS and one in the clear.
  if (!base || url.origin !== base.origin) return { verdict: 'BLOCKED · host not in the catalog', host };

  if (url.username || url.password) return { verdict: 'BLOCKED · credentials in the url', host };

  // Loopback over plain http is how the tests reach a local server; a real source is always https.
  if (url.protocol !== 'https:' && !LOOPBACK.test(url.hostname)) return { verdict: 'BLOCKED · not https', host };

  const methods = step.server.methods.map(m => m.toUpperCase());
  if (!methods.includes(step.method.toUpperCase())) return { verdict: 'BLOCKED · method not allowed', host };
  return undefined;
}

/** The key permits and breakers are held under: the origin the catalog allows, not a display name a caller chose. */
export function budgetKey(step: { server: { server: string; baseUrl?: string } }): string {
  try { return step.server.baseUrl ? new URL(step.server.baseUrl).origin : step.server.server; }
  catch { return step.server.server; }
}

/** Headers a caller may not forward: an override header would turn an allowed GET into a write on some stacks. */
const FORBIDDEN_HEADERS = ['x-http-method-override', 'x-method-override', 'x-http-method'];

export function safeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) if (!FORBIDDEN_HEADERS.includes(k.toLowerCase())) out[k] = v;
  return out;
}
