# A layering rule holds only where something checks it, and the boundary checker does not read manifests or tests

Building U-014's coalescing integration test, the first pass placed it under `packages/control/test/integration/coalesce.test.ts` and added `@falens/service` as a dependency of `@falens/control` so the test could exercise the service's `create_run` use-case. That reverses architecture §2's dependency direction: control is the layer below service, and a package below must not depend on the layer above it. `node tool/check-boundaries.mjs` passed anyway, because it reads source-file imports to check the boundary, not `package.json` dependency lists or test-file imports — a test-only dependency addition is invisible to it.

The fix: the test moved to `packages/service/test/integration/`, with its own container harness, so the dependency runs in the correct direction. The general lesson: before relying on an automated boundary check to catch a layering mistake, know what it actually reads (source imports only, here) — a test file or a manifest edit can violate the same rule the checker exists to enforce and pass clean. Filed as U-028 to widen the checker's coverage.

Source: U-014, 2026-09-09 (build-step self-correction, confirmed by adr-reviewer).
