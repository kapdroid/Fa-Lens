# The kernel stays pure by taking the executor as a callback and asserting latency from its reported duration, never a clock

Rule: `runFlow(flow, context, execute)` never performs I/O itself. `execute(request) => Promise<StepResult>` is the caller's only I/O boundary — workers pass a real adapter, tests pass a stub. Because of this, latency assertions (`lte`/`gte` against a duration) must read the duration the executor reports in its `StepResult`, never call `Date.now()` or any clock inside the kernel. This keeps the kernel a pure library (ADR-0015) and makes latency tests deterministic: a stub executor can report any duration it likes without a real sleep, so `latency` assertion tests run instantly and never flake on machine speed.

If you find yourself reaching for `Date.now()`, `performance.now()`, or a timer inside `packages/kernel/src/flow/**` or `verdict/**`, that is a purity violation — move the timing into whatever calls `execute`.

Source: U-008, 2026-09-09.
