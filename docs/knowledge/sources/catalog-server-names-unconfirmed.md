# Catalog server names come from artifact tools, not from a confirmed replica list

The v1 source catalog (`packs/_sources/catalog.yaml`, ADR-0013) uses server names already seen in the artifact tools — `transaction-db`, `mars-transaction-db`, `colpal-transaction-db`, `haldiram-transaction-db`, `slmg-transaction-db`, `bdf-transaction-db`, `master-db`/`<tenant>-master-db`, and the Report/DMS placeholder hosts (`report-<tenant>`, `dms-<tenant>`). Seeing a name in an artifact tool's `TENANTS` map is not the same as confirming it is a **read replica**, which ADR-0013 requires for every entry ("the v1 catalog points only at replicas; primaries are not listed at all").

Every source in the catalog therefore carries `confirm: true` until an adapter unit actually connects and checks. Do not flip `confirm` to `false` from the catalog unit alone — that is a follow-up unit's job (owner confirms per-source, records it, and `tool/check-catalog.mjs` should print zero placeholder warnings only once every entry is verified). An adapter unit that connects to a source should require `confirm: false` for that source in its own DoD, precisely so a real connection is never made against an unverified hostname just because the catalog file happened to compile.

Source: E-004, 2026-09-09
