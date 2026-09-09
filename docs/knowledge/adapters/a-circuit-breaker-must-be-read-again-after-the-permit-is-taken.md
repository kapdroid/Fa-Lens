# A circuit breaker must be read again after the permit is taken, and the second read must not consume the trial

Checking the breaker once, before a step is queued for a concurrency permit, is not enough: if the breaker opens while the step is waiting for that permit, every already-queued step still reaches the now-down source, because nothing re-checked the breaker between "queued" and "sent". The breaker has to be read again immediately before the request goes out, after the permit is taken.

That second read cannot reuse the same call as the first: a half-open breaker allows exactly one trial request through, and a check that both reads and consumes the half-open trial slot will burn it just by asking "am I allowed to try?", starving the actual request that was supposed to be the trial. The read taken after the permit — the one that gates the real send — has to be a non-consuming peek; only the outcome of the request itself (success or failure) may consume or clear the half-open state.

Source: U-012, 2026-09-09 (adapter-safety-reviewer round 1 finding: queued steps reaching an opened breaker, and a failed half-open trial not re-opening).
