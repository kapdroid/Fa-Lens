// Date windows (ADR-0014): background ranges run in windows of at most seven days; an interactive
// range beyond 31 days is refused so a person never waits on a query the source should not be asked.
export const MAX_WINDOW_DAYS = 7;
export const MAX_INTERACTIVE_DAYS = 31;

export class InteractiveRangeTooLarge extends Error {
  constructor(days: number) {
    super(`interactive runs cover at most ${MAX_INTERACTIVE_DAYS} days; this range is ${days}. Run it in the background instead.`);
    this.name = 'InteractiveRangeTooLarge';
  }
}

export interface DateRange { dateFrom: string; dateTo: string }

export interface WindowOptions {
  maxDays?: number;
  interactive?: boolean;
}

const toUtc = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const asDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Split an inclusive date range into contiguous windows, newest last. */
export function splitWindows(range: DateRange, options: WindowOptions = {}): DateRange[] {
  const from = toUtc(range.dateFrom); const to = toUtc(range.dateTo);
  if (Number.isNaN(from) || Number.isNaN(to)) throw new Error(`splitWindows: dates must be YYYY-MM-DD, got ${range.dateFrom} and ${range.dateTo}`);
  if (to < from) throw new Error(`splitWindows: ${range.dateTo} is before ${range.dateFrom}`);
  const days = Math.round((to - from) / 86400000) + 1;
  if (options.interactive && days > MAX_INTERACTIVE_DAYS) throw new InteractiveRangeTooLarge(days);
  const size = options.maxDays ?? MAX_WINDOW_DAYS;
  const windows: DateRange[] = [];
  for (let start = from; start <= to; start += size * 86400000) {
    const end = Math.min(start + (size - 1) * 86400000, to);
    windows.push({ dateFrom: asDate(start), dateTo: asDate(end) });
  }
  return windows;
}
