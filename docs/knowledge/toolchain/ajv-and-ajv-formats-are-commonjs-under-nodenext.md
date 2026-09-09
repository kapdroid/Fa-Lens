# `ajv` and `ajv-formats` are CommonJS; import them accordingly under NodeNext

Both packages ship as CommonJS with no ESM build. Under `moduleResolution: NodeNext` a plain default import of `ajv` resolves to the module namespace object, not the `Ajv` class — `new Ajv()` then fails. Use the named export instead: `import { Ajv } from 'ajv'`. `ajv-formats`'s default export is likewise wrapped; a default import gives the CJS module object, and the function to call for its side effect is on `.default`: `import addFormats from 'ajv-formats'; addFormats.default(ajv)` (or destructure `.default` once at the import site, depending on how TS's interop settings resolve it — check the actual shape at the call site rather than assuming a bare default import works).

A related consequence: since `resolveJsonModule` is off in `tsconfig.base` for this repo, JSON Schema documents cannot be `import`ed as `.json` files. Keep them as plain draft-07 objects exported from a `.ts` module (see `packages/kernel/src/pack/schemas/index.ts`) instead of `.json` files with an `import … assert { type: 'json' }` or `resolveJsonModule` workaround.

Source: U-007, 2026-09-09
