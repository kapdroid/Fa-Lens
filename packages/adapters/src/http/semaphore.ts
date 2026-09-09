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
    // The permit is handed over already counted; the waiter does not increment again.
    await new Promise<void>(resolve => waiting.push(resolve));
  };
  // Hand the permit straight to a waiter rather than releasing and re-taking it, so the count can never
  // dip in the window before that waiter resumes.
  const give = (): void => {
    const next = waiting.shift();
    if (next) next(); else active -= 1;
  };
  return {
    async run(work) {
      await take();
      try { return await work(); } finally { give(); }
    },
    inFlight: () => active,
  };
}
