// One breaker per server. An open breaker means the source is down, which is not the same as a failed
// test: the caller reports `source down` and other servers carry on (ADR-0005).
export type BreakerState = 'closed' | 'open' | 'half-open';

export interface Breaker {
  state: (key: string) => BreakerState;
  /** True when the call may go ahead. A half-open breaker allows exactly one trial. */
  allow: (key: string) => boolean;
  succeeded: (key: string) => void;
  failed: (key: string) => void;
}

interface Entry { failures: number; openedAt: number; trialInFlight: boolean }

export function breaker(failuresToOpen: number, cooldownMs: number, now: () => number = Date.now): Breaker {
  const entries = new Map<string, Entry>();
  const of = (key: string): Entry => {
    const existing = entries.get(key);
    if (existing) return existing;
    const fresh: Entry = { failures: 0, openedAt: 0, trialInFlight: false };
    entries.set(key, fresh);
    return fresh;
  };
  const state = (key: string): BreakerState => {
    const e = of(key);
    if (e.openedAt === 0) return 'closed';
    return now() - e.openedAt >= cooldownMs ? 'half-open' : 'open';
  };
  return {
    state,
    allow(key) {
      const e = of(key);
      const s = state(key);
      if (s === 'closed') return true;
      if (s === 'open') return false;
      if (e.trialInFlight) return false;
      e.trialInFlight = true;
      return true;
    },
    succeeded(key) {
      const e = of(key);
      e.failures = 0; e.openedAt = 0; e.trialInFlight = false;
    },
    failed(key) {
      const e = of(key);
      e.trialInFlight = false;
      e.failures += 1;
      if (e.failures >= failuresToOpen) { e.openedAt = now(); e.failures = 0; }
    },
  };
}
