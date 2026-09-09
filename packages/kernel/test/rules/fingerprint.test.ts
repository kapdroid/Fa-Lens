import { describe, expect, test } from 'vitest';
import { bucketFingerprint, classify, diffFingerprints } from '../../src/index.ts';

const rows = (n: number, qty: number) => Array.from({ length: n }, (_, i) => ({ CycleNo: 14, ProductCode: `P${i}`, Quantity: qty, CreatedOn: '2026-08-05' }));

describe('bucketFingerprint', () => {
  test('is stable for the same rows, does not depend on row order, and counts distinct identities', () => {
    const options = { keys: ['CycleNo'], measures: ['Quantity'], identity: ['ProductCode'] };
    const a = bucketFingerprint(rows(3, 2), options);
    const b = bucketFingerprint([...rows(3, 2)].reverse(), options);
    expect(a).toEqual(b);
    expect(a[0]).toMatchObject({ key: '14', count: 3, distinct: 3, sums: { Quantity: 6 } });
    expect(a[0]?.hash).toMatch(/^[0-9a-f]{16}$/);
  });

  test('changes when a measure changes', () => {
    const a = bucketFingerprint(rows(3, 2), { keys: ['CycleNo'], measures: ['Quantity'], identity: ['ProductCode'] });
    const b = bucketFingerprint(rows(3, 3), { keys: ['CycleNo'], measures: ['Quantity'], identity: ['ProductCode'] });
    expect(a[0]?.hash).not.toBe(b[0]?.hash);
  });
});

describe('classify', () => {
  const bucket = (over: Partial<{ key: string; count: number; distinct: number; sums: Record<string, number>; hash: string }> = {}) =>
    ({ key: '14', count: 2, distinct: 2, sums: { Quantity: 10 }, hash: 'abc', ...over });

  test('equal fingerprints are balanced', () => {
    expect(classify(bucket(), bucket())).toBe('balanced');
  });

  test('a bucket missing on the enrich side is a sync gap once it is older than the grace window', () => {
    expect(classify(bucket({ key: '2026-08-01' }), undefined, { graceDays: 2, today: '2026-08-31' })).toBe('sync gap');
  });

  test('the same bucket inside the grace window is audit pending, not a gap', () => {
    expect(classify(bucket({ key: '2026-08-30' }), undefined, { graceDays: 2, today: '2026-08-31' })).toBe('audit pending');
  });

  test('a repeated key on either side is a duplicate', () => {
    expect(classify(bucket({ count: 3, distinct: 2 }), bucket())).toBe('duplicate');
  });

  test('more on the anchor than the enrich side is a physical short', () => {
    expect(classify(bucket({ sums: { Quantity: 12 } }), bucket({ sums: { Quantity: 10 }, hash: 'def' }))).toBe('physical short');
  });

  test('anything else that differs is unexplained', () => {
    expect(classify(bucket({ sums: { Quantity: 8 } }), bucket({ sums: { Quantity: 10 }, hash: 'def' }))).toBe('unexplained');
    expect(classify(undefined, bucket())).toBe('unexplained');
  });
});

describe('diffFingerprints', () => {
  test('returns only the differing buckets, each with a cause and a delta per measure', () => {
    const anchor = [
      { key: '2026-08-01', count: 2, distinct: 2, sums: { Quantity: 10 }, hash: 'a' },
      { key: '2026-08-02', count: 2, distinct: 2, sums: { Quantity: 12 }, hash: 'b' },
      { key: '2026-08-03', count: 1, distinct: 1, sums: { Quantity: 5 }, hash: 'c' },
    ];
    const enrich = [
      { key: '2026-08-01', count: 2, distinct: 2, sums: { Quantity: 10 }, hash: 'a' },
      { key: '2026-08-02', count: 2, distinct: 2, sums: { Quantity: 9 }, hash: 'z' },
    ];
    const diffs = diffFingerprints(anchor, enrich, { graceDays: 2, today: '2026-08-31' });
    expect(diffs.map(d => d.key)).toEqual(['2026-08-02', '2026-08-03']);
    expect(diffs[0]).toMatchObject({ cause: 'physical short', deltas: { Quantity: 3 } });
    expect(diffs[1]?.cause).toBe('sync gap');
  });
});
