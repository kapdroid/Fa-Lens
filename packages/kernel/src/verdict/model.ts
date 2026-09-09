// Verdict model. `error` (the check could not run: source down, transport, exception) is never `fail`
// (the product answered and the assertion did not hold) — docs/architecture.md §6.
// Worst-of order, lowest to highest: none < skipped < ok < warn < error < fail.
// A fail is a confirmed defect and outranks an error, which is an unknown; counts keep both visible
// so the UI can show "source down" separately from "1 failing · 4 warn" (docs/design/screens.md).

export type Severity = 'none' | 'skipped' | 'ok' | 'warn' | 'error' | 'fail';

export const SEVERITY_ORDER: readonly Severity[] = ['none', 'skipped', 'ok', 'warn', 'error', 'fail'];

export const rank = (s: Severity): number => SEVERITY_ORDER.indexOf(s);

export const worst = (a: Severity, b: Severity): Severity => (rank(a) >= rank(b) ? a : b);

export type Counts = Record<Severity, number>;

export const emptyCounts = (): Counts => ({ none: 0, skipped: 0, ok: 0, warn: 0, error: 0, fail: 0 });

export interface Rolled {
  severity: Severity;
  /** How many direct children ended at each severity: modules of a company, types of a module, steps of a flow. */
  counts: Counts;
}

/** Fold children into one verdict: worst severity wins, and every direct child is counted. */
export function rollup(children: readonly { severity: Severity }[]): Rolled {
  const counts = emptyCounts();
  let severity: Severity = 'none';
  for (const child of children) {
    counts[child.severity] += 1;
    severity = worst(severity, child.severity);
  }
  return { severity, counts };
}
