// Aggregate-first comparison (ADR-0014): both sides return per-bucket counts, sums and a hash;
// only the buckets whose fingerprints differ ever fetch rows.
import { canonicalJson } from '../pack/hash.ts';
import type { Bucket, Cause } from './types.ts';

/** 64-bit FNV-1a over the canonical bucket content. A change detector, not a security hash, so it stays synchronous. */
function fnv1a(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export interface FingerprintOptions {
  /** Columns that define a bucket, for example the day or the cycle. */
  keys: string[];
  measures: string[];
  /** Columns that should be unique inside a bucket; a bucket with more rows than distinct identities repeats a key. Defaults to the bucket keys. */
  identity?: string[];
}

/** Group rows into buckets by their key columns and fingerprint each bucket. Row order never matters. */
export function bucketFingerprint(rows: readonly Record<string, unknown>[], options: FingerprintOptions): Bucket[] {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = options.keys.map(k => String(row[k] ?? '')).join('|');
    const bucket = groups.get(key);
    if (bucket) bucket.push(row); else groups.set(key, [row]);
  }
  const out: Bucket[] = [];
  for (const [key, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sums: Record<string, number> = {};
    for (const measure of options.measures) sums[measure] = group.reduce((total, row) => total + (typeof row[measure] === 'number' ? (row[measure] as number) : 0), 0);
    const identityColumns = options.identity ?? options.keys;
    const identities = group.map(row => identityColumns.map(k => String(row[k] ?? '')).join('|'));
    out.push({ key, count: group.length, distinct: new Set(identities).size, sums, hash: fnv1a(canonicalJson({ key, count: group.length, sums })) });
  }
  return out;
}

export interface ClassifyOptions {
  /** How many days the enrich side may lag before an absence stops being expected. */
  graceDays?: number;
  /** Today, as YYYY-MM-DD; passed in so the kernel never reads a clock. */
  today?: string;
}

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

/** Why these two fingerprints of the same bucket differ, in the product's own words. */
export function classify(anchor: Bucket | undefined, enrich: Bucket | undefined, options: ClassifyOptions = {}): Cause {
  // A repeated key is a defect even when both sides repeat it identically, so it is read before agreement.
  if (anchor && anchor.count > anchor.distinct) return 'duplicate';
  if (enrich && enrich.count > enrich.distinct) return 'duplicate';
  if (anchor && enrich && anchor.hash === enrich.hash) return 'balanced';
  if (anchor && !enrich) {
    const { graceDays, today } = options;
    if (graceDays !== undefined && today !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(anchor.key) && daysBetween(anchor.key, today) <= graceDays) return 'audit pending';
    return 'sync gap';
  }
  if (!anchor) return 'unexplained';
  if (enrich) {
    const measures = new Set([...Object.keys(anchor.sums), ...Object.keys(enrich.sums)]);
    let anchorHigher = false; let anchorLower = false;
    for (const m of measures) {
      const a = anchor.sums[m] ?? 0; const e = enrich.sums[m] ?? 0;
      if (a > e) anchorHigher = true;
      if (a < e) anchorLower = true;
    }
    if (anchorHigher && !anchorLower) return 'physical short';
  }
  return 'unexplained';
}

export interface BucketDiff {
  key: string;
  cause: Cause;
  /** anchor minus enrich, per measure. */
  deltas: Record<string, number>;
  anchor?: Bucket;
  enrich?: Bucket;
}

/** Every bucket whose two sides disagree, with the reason and the size of the difference. */
export function diffFingerprints(anchor: readonly Bucket[], enrich: readonly Bucket[], options: ClassifyOptions = {}): BucketDiff[] {
  const byKey = new Map<string, Bucket>();
  for (const b of enrich) byKey.set(b.key, b);
  const seen = new Set<string>();
  const diffs: BucketDiff[] = [];
  const consider = (key: string, a: Bucket | undefined, e: Bucket | undefined) => {
    const cause = classify(a, e, options);
    if (cause === 'balanced') return;
    const deltas: Record<string, number> = {};
    for (const m of new Set([...Object.keys(a?.sums ?? {}), ...Object.keys(e?.sums ?? {})])) deltas[m] = (a?.sums[m] ?? 0) - (e?.sums[m] ?? 0);
    const diff: BucketDiff = { key, cause, deltas };
    if (a) diff.anchor = a;
    if (e) diff.enrich = e;
    diffs.push(diff);
  };
  for (const a of anchor) { seen.add(a.key); consider(a.key, a, byKey.get(a.key)); }
  for (const e of enrich) if (!seen.has(e.key)) consider(e.key, undefined, e);
  return diffs.sort((x, y) => x.key.localeCompare(y.key));
}
