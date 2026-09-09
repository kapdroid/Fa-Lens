// Everything that must be refused before a socket is opened. Each refusal answers in plain words,
// because a person reading a run needs to know why a call did not happen.
import type { ResolvedStep } from '../adapter.ts';

export interface Refusal { verdict: string; host: string }

const LOOPBACK = /^(localhost|127(\.\d+){3}|\[::1\]|::1)$/i;

const READ_ONLY_METHODS = ['GET', 'HEAD'];

export interface GuardOptions {
  /** Lets a test reach a local server over plain http. A worker never sets it. */
  allowInsecureLoopback?: boolean;
}

/** Undefined when the call is allowed; otherwise the reason it was not. */
export function refuse(step: ResolvedStep, options: GuardOptions = {}): Refusal | undefined {
  let url: URL;
  try { url = new URL(step.url); } catch { return { verdict: 'BLOCKED · not a usable url', host: '' }; }
  const host = url.host;

  let base: URL | undefined;
  try { base = step.server.baseUrl ? new URL(step.server.baseUrl) : undefined; } catch { base = undefined; }

  // A scheme the URL parser does not know gives every url the origin "null", which would compare equal.
  if (!base || base.origin === 'null' || url.origin === 'null') return { verdict: 'BLOCKED · host not in the catalog', host };

  // Origin, not host: a scheme comparison is the difference between a bearer token over TLS and one in the clear.
  if (url.origin !== base.origin) return { verdict: 'BLOCKED · host not in the catalog', host };

  if (url.username || url.password) return { verdict: 'BLOCKED · credentials in the url', host };

  const loopbackAllowed = options.allowInsecureLoopback === true && LOOPBACK.test(url.hostname);
  if (url.protocol !== 'https:' && !loopbackAllowed) return { verdict: 'BLOCKED · not https', host };

  const method = step.method.toUpperCase();
  const methods = step.server.methods.map(m => m.toUpperCase());
  if (!methods.includes(method)) return { verdict: 'BLOCKED · method not allowed', host };
  // Even a catalog that lists a writing method may only be asked for one on a sandbox source
  // (docs/architecture.md §8): sources are read-only everywhere else, whatever the file says.
  if (!READ_ONLY_METHODS.includes(method) && step.server.sandbox !== true) {
    return { verdict: 'BLOCKED · writing method outside a sandbox source', host };
  }
  return undefined;
}

/** The key permits and breakers are held under: the origin the catalog allows, not a display name a caller chose. */
export function budgetKey(step: { server: { server: string; baseUrl?: string } }): string {
  try { return step.server.baseUrl ? new URL(step.server.baseUrl).origin : step.server.server; }
  catch { return step.server.server; }
}

/** Headers a caller may not forward: an override header would turn an allowed GET into a write on some stacks. */
const FORBIDDEN_HEADERS = ['x-http-method-override', 'x-method-override', 'x-http-method', 'host', ':authority'];

export function safeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) if (!FORBIDDEN_HEADERS.includes(k.toLowerCase())) out[k] = v;
  return out;
}
