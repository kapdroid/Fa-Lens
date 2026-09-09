import { expect, test } from 'vitest';
import { InteractiveRangeTooLarge, splitWindows } from '../../src/index.ts';

test('a 31-day range splits into windows of at most seven days that cover it exactly', () => {
  const windows = splitWindows({ dateFrom: '2026-08-01', dateTo: '2026-08-31' });
  expect(windows).toHaveLength(5);
  expect(windows[0]).toEqual({ dateFrom: '2026-08-01', dateTo: '2026-08-07' });
  expect(windows.at(-1)).toEqual({ dateFrom: '2026-08-29', dateTo: '2026-08-31' });
  for (const w of windows) expect(new Date(w.dateTo).getTime() - new Date(w.dateFrom).getTime()).toBeLessThanOrEqual(6 * 86400000);
});

test('a single day is one window', () => {
  expect(splitWindows({ dateFrom: '2026-08-05', dateTo: '2026-08-05' })).toEqual([{ dateFrom: '2026-08-05', dateTo: '2026-08-05' }]);
});

test('an interactive range beyond 31 days is refused with InteractiveRangeTooLarge', () => {
  expect(() => splitWindows({ dateFrom: '2026-08-01', dateTo: '2026-09-01' }, { interactive: true })).toThrow(InteractiveRangeTooLarge);
  try { splitWindows({ dateFrom: '2026-08-01', dateTo: '2026-09-01' }, { interactive: true }); } catch (e) { expect((e as Error).name).toBe('InteractiveRangeTooLarge'); }
});

test('the same range runs in the background, where the cap does not apply', () => {
  expect(splitWindows({ dateFrom: '2026-08-01', dateTo: '2026-09-01' }).length).toBe(5);
});

test('a range whose end precedes its start is refused', () => {
  expect(() => splitWindows({ dateFrom: '2026-08-10', dateTo: '2026-08-01' })).toThrow(/before/);
});
