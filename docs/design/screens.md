# Screens

Every screen is composed from `components.md`. Every data region has four states: **loading** (skeleton), **empty** (one sentence + one action), **error** (what happened + how to fix), **populated**. Layouts assume the app shell; regions are named so a builder can map them to a grid.

## Navigation model

Three levels, always in this order: **Company → Module → Testing type**. Health rolls up: a testing type's verdict → the module's verdict (worst of its types) → the company's verdict (worst of its modules). The drawer shows this hierarchy; the company page shows it as a matrix; the module page shows one row of it as tabs.

Van Sales is only the first pack. Nothing in the shell is module-specific.

## App shell (all screens)

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│ ◎ FA Lens      ‹ │ ContextBar  Env · Tenant · Company · User   preset ☾ ◯ │
│ ⌕ Find…      ⌘K  ├────────────────────────────────────────────────────────┤
│ ● Mars Wrigley VN│ crumbs  Company › Module › Type                        │
│   234474 · 9 mods│ Title                                  [Run <scope>]   │
│ ─ PINNED ─────── │ Tabs (module only)                                     │
│ ● Van Sales 3 fail├─────────────────────────────┬─────────────────────────┤
│ ─ FIELD APP ──── │ Content                     │ FocusPanel (when open)  │
│ ● Van Sales      │                             │ breadcrumb › … › …      │
│ ● Journey Plan   │                             │                         │
│ ● Outlets        │                             │                         │
│ ─ DASHBOARD ──── │                             │                         │
│ ● Schemes        │                             │                         │
│ ─ DATA & SYNC ── │                             │                         │
│ ● FA ↔ DMS sync  │                             │                         │
│ ▤ Suites  ▣ Runs │                             │                         │
│ ✉ Suggestions ⚙  │                             │                         │
└──────────────────┴─────────────────────────────┴─────────────────────────┘
```

- **Drawer** (see `components.md` → Drawer): 260px expanded, 56px collapsed (`[` toggles). Company entry on top with its ApertureRing. Modules grouped by pack category, collapsible, with health dot and a one-word summary (`3 fail`, `gaps`, `ok`, `no runs`). Pinned group on top, per user. Hovering a module opens a flyout with its five testing types and two actions (Run smoke, Open failures), so any type of any module is one hover + one click away without opening the module.
- ContextBar sticky. Page header under it has breadcrumb `Company › Module › Type` and **one** primary button whose label names the scope it runs: `Run all (9 modules)`, `Run Van Sales smoke`, `Run flow`, `Run`.
- Content region `max-width: var(--content-max)`, padding 24px. FocusPanel pushes content left (transform), never overlays.
- Below `md`: drawer collapses to icons, FocusPanel becomes full-width with a back bar, tiles wrap 2-up.

---

## S0 Company (home)

Job: the whole company's testing health on one screen, and the fastest path to any red cell.

Regions:
1. **Header**: company name + id + env, verdict badge (`1 failing · 4 warn`), last full run, toggle `By type · Compare tenants`, `Schedule`, primary `Run all (N modules)`.
2. **Status line**: run id · time · modules · flows · cases · rows looked at · duration.
3. **Tiles**: Company verdict (ApertureRing + failing-module count) · API coverage `212 / 273` with "changed without tests" · Modules with no runs · Slowest p95 with the module name.
4. **Matrix**: rows = modules grouped by category, columns = testing types (APIs, Cases, Flows, Validations, Load) + p95. Each cell is a verdict chip with the type's summary text (`42/61`, `3 fail`, `flaky`, `3 issue`, `—`). Cell click → that module's tab, pre-filtered. Row click → module Overview. `Run all` turns every non-empty cell `running` and resolves them one by one (cell-level cascade); the ring closes at the end.
5. **Compare tenants** view: same rows, columns become the six tenants, cells are module verdicts per tenant. A red cell in one column only is a tenant-specific bug.
6. **Coverage gaps** list (changed endpoints without tests, modules with no runs, modules without validations) and **Company verdict strip** (last 30 runs) with the top suites.

Empty (new company): tiles `—`, matrix cells `no runs`, one banner: "Nothing has run for Big Tree Zambia yet. Run all publishes a first baseline." [Run all].

## S0b Suites

Job: cross-module bundles that run on a schedule or on deploy: Release regression, Nightly smoke, Security sweep, module month-end sets.

Regions: list rows (name, cell count, schedule, mini RunStrip, verdict, `Run`), `New suite`. A suite page is the company matrix with only the selected cells lit; selecting cells on the company matrix and pressing `Save as suite` is how a suite is born.

---

## Module page (S1–S8 share this frame)

Tabs, fixed order: Overview · APIs · Cases · Flows · Validations · **Load** · Runs · Data · Knowledge. Each tab that has a verdict shows a 6px health dot before its label. Keys `1`–`9` switch tabs. The primary button's label changes per tab (see App shell).

### Empty states per tab

Never an empty screen: each tab's empty state is one sentence in plain words plus one primary action whose label names what happens (components.md → EmptyState). The sentence names the scope it is empty for, so a reader knows it is not a loading failure.

| Tab | Empty state (one sentence) | Primary action |
|---|---|---|
| Overview | No runs yet for Van Sales in Mars · 234474. Run the smoke flow to get a first verdict. | Run smoke flow |
| APIs | No endpoints in the catalog for this module yet. Import a Postman collection or an OpenAPI spec to fill it. | Import collection |
| Cases | No cases yet. Generate from the catalog or save one from the workbench. | Generate cases |
| Flows | No flows in Van Sales. Start from the app's real sequence. | New flow: App day cycle |
| Validations | No validation has run for this scope yet. Choose a validation and a date range to run one. | Run cycle reconciliation |
| Load | No load tests yet. Export a k6 script from any flow or endpoint to start one. | Export k6 script |
| Runs | Nothing has run in this scope yet. Results appear here the moment a run finishes. | Run smoke flow |
| Data | No test users or fixtures for this tenant yet. Add a test user to run write flows on the sandbox company. | Add test user |
| Knowledge | No notes for this module yet. Sync the ADO knowledge base or write the first gotcha. | Sync from ADO |

For sync packs the same rule applies with the module's own verbs (Flows: "No chains defined for this company yet." → Run chain discovery). A tab that cannot be empty for structural reasons (Overview with a registry entry) still shows this state until the first run has written a verdict.

## S1 Module · Overview

Job: module health at a glance and the fastest path to what is wrong.

Regions:
1. **Tiles row** (4 up): Endpoints covered `42 / 61` (neutral, click → APIs filtered to "no tests") · Last run verdict (primary tile with ApertureRing, ok/crit) · Open issues `3` (crit, click → Validations filtered) · p95 `412 ms` with delta.
2. **RunStrip** with label `Last 30 runs` and "View all" → Runs.
3. **Two columns**: left "Needs attention" list (failed cases, flaky flows, endpoints changed since last release without tests: each a row with badge + one-line reason + `Open`); right "Recent runs" (5 rows: run id mono, flow, verdict badge, duration, who).
4. **Knowledge strip**: 3 latest gotchas for this module with source chip.

Empty (new pack): tiles show `—`, one card: "No runs yet for Van Sales in Mars · 234474. Run the smoke flow." [Run smoke flow].

## S2 Module · APIs (catalog + workbench)

Job: find an endpoint in 3 seconds, send a request in 3 clicks.

Regions:
1. **Toolbar**: search (path/summary, mono), group toggle `By controller · By tag · Flat`, filter chips `no tests · changed since release · slow`, surface switch `App · Dashboard · External`, `New endpoint` (accent), `Import` (ghost: Postman, OpenAPI, curl, HAR).
2. **EndpointRow list**, grouped with sticky group headers (controller name + count). Manual endpoints carry a `manual` chip until the catalog sync matches them.
3. **FocusPanel = Workbench** on row click: request editor with context-injected auth, Send (primary), response viewer, history strip, and the row's cases/flows as two small lists at the bottom.

Populated example: `POST /api/day/begin` · "Start day session" · `3 cases · 2 flows` · `p95 388 ms` · `PASS 2h ago`.

## S3 Module · Cases

Job: see every test case for the module and run any subset.

Regions:
1. Toolbar: search, kind chips (`happy · negative · security · boundary · manual`), verdict chips, `Generate cases` (accent, opens Suggestions with drafts), `Run selected` (primary when selection > 0).
2. CaseRow table, grouped by endpoint. Tenant parity column = 6 dots (one per tenant) colored by last verdict; hover names the tenant.
3. FocusPanel on row: case editor (request, expected, assertions), last 10 results as a RunStrip, "Open in workbench".

Empty: "No cases yet. Generate from the catalog or save one from the workbench." [Generate cases].

## S4 Module · Flows

Job: build and run automated sequences; see exactly where they break.

Regions:
1. Left list (280px): flows with verdict badge, RunStrip (mini), tags. `New flow` (accent) → template picker: API sequence · Validation · Cross-source · Record from session.
2. Main: **StepCard timeline** for the selected flow. Header: name, description, params chips (`companyId · employeeId · dateFrom`), `Run` (primary), `Matrix run`, `Export ▾` (Postman · k6 · YAML), `Share`.
3. Right pane (toggle): YAML mirror, two-way, mono.
4. During and after a run: `cascade` + `refract`; fail card auto-expands with request / response / diff.

Empty: "No flows in Van Sales. Start from the app's real sequence." [New flow: App day cycle].

## S5 Module · Validations

Job: the validator's screen. Three inputs, one click, verdict, drill-down.

Regions:
1. **Input bar** (inline, not a form page): validation picker (`Cycle reconciliation · Mapping validator · …`), identifier input (employee ids / ERP ids / distributor id, comma list, mono), date range, mode chips (`Actual · Determined`, `Issues only · All`, `Productwise`), `Run` (primary). Presets dropdown.
2. **Tiles**: Employees · Cycles · Issue cycles (crit) · Mismatch rows · plus "looked at" line: `12,480 rows · ran 14:02 · 6.1 s`.
3. **Cycle table**: Employee (two-line) · Cycle # · Date · Van · End approval badge · Approval rule badge · Start type · Status · Products · Reconciliation badge (`3 mismatch`) · Reason (truncated, tooltip) · Carry-flag badge. Issue rows tinted crit; info-only rows tinted info; context rows (the cycle before and after an issue) untinted with a dim `context` chip.
4. **FocusPanel L1 = Cycle detail**: header (Cycle 14 · 2026-08-27 · Van 5512 · Approved), summary chips (start / additional / sale / end / expected), product table (Product two-line · Batch · DayStart · Additional · Sale · DayEnd · Calculated · Flag badge), `Download this cycle`.
5. **FocusPanel L2 = Product trace**: timeline of every raw event for this product in this cycle: `StockofDayStart #… 12 units 08:41`, `Invoice INV-0091 outlet Sharma Store 3 units 10:12`, …, `StockofDayEnd #… 8 units 18:05`, each with source db chip and id mono. Diff block at the bottom (`expected 9 · actual 8 · Δ −1`). `Open in DB` (copies the read-only query), `Create bug` (v1.5).
6. Export: `Download Excel` (current employee or all), `Total Loadout` as a second tab in the same table region.

Loading: input bar stays interactive except Run; tiles skeleton; table 8 skeleton rows; status line streams "Fetching VanDayStocks · 1,200 rows…".

Error: inline banner above tiles in `crit-soft`: "Company 234474 has no van stock under Mars. Check the tenant." [Switch tenant]. Never a blank table.

## S5b Module · Load

Job: a deliberate load test on a flow or endpoint, without leaving the module.

Regions: input bar (target `Flow · name` or `Endpoint`, virtual users, duration, ramp, env with Prod disabled and explained), `Export k6 script` (v1), primary `Run load test` (v1.5), tiles p50 / p95 with threshold / error rate / throughput, latency-over-run bar strip, thresholds as warn tint on bars. Every ordinary run already records p95 per endpoint; this tab is for the intentional test.

## S6 Module · Runs

Job: history, diff, trust.

Regions:
1. Filters: flow, verdict, who, date. `Compare` (select two runs).
2. Table: Run id mono · Flow · Scope (tenant · company) · Verdict badge · counts (pass/fail/skip mono) · duration · started · by. Flaky flag chip when the same flow alternates verdicts over the last 5 runs.
3. FocusPanel: run detail = the same StepCard timeline in read-only, plus the "looked at" line and links to artifacts (Excel, JUnit). `Mark as baseline` (outline). Compare view: two timelines side by side, diverging steps highlighted.

## S7 Module · Data

Job: test data without asking anyone.

Regions: tabs `Contexts · Users · Fixtures · Generators`. Contexts = saved presets (tenant, company, user, env) with `Use` action. Users = per-tenant test users, role chip, last used; passwords never shown (vault). Fixtures = named JSON bodies with schema validation badge. Generators = schema-driven valid/invalid/boundary payload makers with `Preview`.

## S8 Module · Knowledge

Job: what a newcomer must know before touching this module.

Regions: list of notes (title, category chip, source chip, confidence dots, updated), search, `Sync from ADO` (ghost). FocusPanel shows the note in full with related endpoints and flows as chips; `Make a regression flow from this` (accent) → Suggestions.

## S12 Data & sync module (pack kind: `sync`)

A sync pack compares rows **between sources** (FA, Report, DMS, Unify). Its module page keeps the fixed tab frame, but three tabs have their own bodies. UI concepts here follow the proven recon dashboard patterns (flow map, chain hops, failure grid, evidence panel, issues worklist, declarative rules); the architecture underneath is FA Lens's own.

Vocabulary for causes, plain words, never codes: `sync gap` · `audit pending` · `unexplained` · `physical short` · `duplicate` · `balanced`.

### Overview
1. **Tiles**: Health (% of checks passing, sparkline) · Missing (crit) · Mismatch (warn) · Aggregate Δ (warn) · Duplicates. Each click → Validations filtered by category.
2. **Flow map** (`FlowMap` component): source nodes left→right (FA Transactions → Report / DMS / Unify), edges colored by status (in sync / warnings / failing / coming soon), edge label = flow ids + fail count, edge width = volume. Edge click → Flows tab with that chain selected. Node click → Validations · Issues filtered to that source. "Looked at N rows · time" chip on the card.
3. **Open issues by severity** list and **Sources** list (dialect, read-only badge, p95).

### Flows (chains)
1. Left list: chains (F1, F3, F5 …) with fail badge. `New chain`.
2. **Hop stepper** (`HopStepper`): one card per hop (source, table, count that made it, note, bar relative to entry), separated by **gaps** that show `−N` dropped and the cause word. Click a hop or gap → failing rows filtered to that hop. `Run chain` fills bars hop by hop.
3. **Rules in this chain** table: rule, type chip (uniqueness / presence / field_match / aggregate_match / chain), severity, fails, cause, `open rows ›`.
4. **Failure grid**: key (id mono, copyable, guid under it), date, van, rule, **source value**, **target value**, Δ (crit tint when non-zero), severity, cause, workflow status select. Banner above: which rule, how many rows, evidence expiry, `Export CSV`. Truncation banner when a cap was hit ("narrow your range").
5. **Evidence panel** (FocusPanel): expiry bar (evidence is time-boxed to the run) · identity block (id, guid, company, date, van, rule, chain + hop; mono, copy on click) · **source ↔ target grid** field by field, differing rows tinted crit on both sides · one-sentence read of the likely cause · actions `Open both rows (read-only)`, `Export this finding`, `Create bug`, `Explain`. **Expired state**: identity block from the ledger, grid greyed with "evidence expired · re-run to refresh", primary `Re-run this rule`. Never blank.

### Validations (Rules · Issues)
Segment control switches between:
- **Rules**: one card per rule: type chip, name, severity, last verdict, enabled toggle, `Preview SQL`, meta line (id, scope, last run, rows). `New rule` opens a wizard: datasource → table (live catalog) → type → columns/join/compare → validity → preview (generated SQL + 10-row sample) → save. `Import JSON`. A rule is one JSON object in the pack; five types cover everything.
- **Issues**: flat worklist across all chains: severity, category (Missing / Mismatch / Duplicate / Aggregate), chain, where, rows, first seen, status (`new / acknowledged / resolved`, workflow only, never writes to a source). Filters by severity, category, source. Row click → that chain's failing rows.

Runs / Data / Knowledge tabs are the standard ones. APIs, Cases, Load show `—` for a sync pack.

## S9 Suggestions inbox (global, from rail)

Job: AI drafts wait here; nothing enters a module until accepted.

Regions: filter by module and source; SuggestionCard list; bulk `Accept all previews that passed`. Accepting animates the card into the module's tab counter (`settle`).

## S10 Settings (admin)

Sources (read-only connection profiles with a live "read-only verified" badge), Tenants and companies catalog, Roles, Packs (installed, version, update), Secrets (vault references only), Integrations (ADO, Slack, Bugsink).

## S11 Command palette (global)

See `components.md`. Opens over any screen. Groups: Actions, Endpoints, Flows, Runs, Companies/Employees (ids jump to top).

---

## Validator's first minute (acceptance path)

Login → rail shows Van Sales with a crit dot → click → Overview shows "Last run: 3 issue cycles" → click tile → Validations tab pre-filtered → click first issue row → FocusPanel cycle detail → click the crit product → trace with Δ → Share. Six clicks from login to root cause, with the URL carrying the whole path.

## Tester's first minute

Login → Van Sales → APIs → type `day/begin` → row → Workbench opens with auth and body pre-filled → Send → 201 → `Save as case` → `Generate cases` → three negative drafts appear in Suggestions with preview verdicts → Accept two → Cases tab counter ticks 1 → 3.
