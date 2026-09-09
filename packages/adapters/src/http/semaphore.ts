// A permit per request in flight, per server. The budget is a promise to the source, so it is kept here
// rather than left to callers.
export interface Semaphore {
  run: <T>(work: () => Promise<T>) => Promise<T>;
  inFlight: () => number;
}

export function semaphore(limit: number): Semaphore {
  let active = 0;
  const waiting: (() => void)[] = [];
  const take = async (): Promise<void> => {
    if (active < limit) { active += 1; return; }
    await new Promise<void>(resolve => waiting.push(resolve));
    active += 1;
  };
  const give = (): void => {
    active -= 1;
    waiting.shift()?.();
  };
  return {
    async run(work) {
      await take();
      try { return await work(); } finally { give(); }
    },
    inFlight: () => active,
  };
}
