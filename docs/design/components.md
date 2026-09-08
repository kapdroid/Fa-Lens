# Components

Every component lists: purpose, anatomy, variants, states, tokens. Sizes are in px on the 4px grid. "Hover" implies a pointer; on touch the same state appears on press.

Shared rules:
- Text color inside a tinted fill (`*-soft`) is the matching **`-text`** token (`ok-text` on `ok-soft`), never the strong color. Strong colors are for fills, dots, bars, and large display numbers.
- Density tokens (`--row-h`, `--row-pad`, `--card-pad`, `--tile-min`, `--th-h`) drive every row and card. Comfortable is the default; `data-density="dense"` on the root switches to dense. Never hardcode a row height.
- Labels inside cards, panels, and forms are sentence case. Uppercase letter-spaced labels exist only in table headers.
- Focus ring for keyboard: `box-shadow: var(--glow-accent)`, plus `outline: none`. Never remove focus without replacing it.
- Interactive rows and cards get the **aberration** fringe on hover (`box-shadow: var(--aberration)`), transition `--d-fast --e-standard`.
- Disabled: `opacity: .45`, `pointer-events: none`. Never grey text on grey.

---

## Badge (verdict)

Purpose: encode a state in form + color so it reads before the text does.

Anatomy: pill · optional 6px dot · uppercase label `--fs-xs`, tracking `.04em`, weight 600 · height 20px · padding 0 8px · radius `--r-pill`.

Variants: `ok` (PASS, OK, MATCH), `warn` (WARN, N/A, PENDING), `crit` (FAIL, MISMATCH, VIOLATION), `info` (SALE ONLY, END ONLY, START ONLY), `neutral` (OPEN, DRAFT, SKIPPED: `surface-3` fill, `text-dim` text), `running` (flare fill `flare-soft`, flare text, dot pulses with `pulse-live`).

Rule: badge text is the verdict word, never a sentence. Count badges (`3 mismatch`) use mono digits.

## Button

Sizes: sm 28px, md 32px, lg 40px. Padding 0 12/14/18px. Radius `--r-sm`. Font `--fs-base` weight 500.

Variants:
- `primary`: fill `flare`, text `ground`, hover `glow-flare`. **One per screen.** The thing the user came to do (Run, Save, Accept).
- `accent`: fill `accent`, text `accent-text`. Secondary positive actions (Add case, New flow).
- `ghost`: transparent, text `text-dim`, hover fill `surface-3`, text `text`.
- `outline`: 1px `hairline`, text `text`.
- `danger`: ghost with `crit` text; confirms before acting.
- `icon`: square, ghost, 32px.

States: hover, active (`press` motion: scale .97), focus, loading (label fades to 0, 14px spinner in `accent`, width locked), disabled.

## Input / Select / Search

Height 32px (md) or 28px (sm). Fill `surface-2`, border 1px `hairline`, radius `--r-sm`, text `--fs-base`, placeholder `text-faint`. Focus: border `accent`, ring `glow-accent`. Error: border `crit`, helper text `crit` below, `--fs-sm`. Search has a leading magnifier and a trailing `⌘K` hint chip when it is the global search.

Numeric and id inputs use `--font-mono`.

## ContextBar

Purpose: the one place the scope lives. Env · Tenant · Company · User. Always visible, sticky top, height `--ctx-h`.

Anatomy: 4 segmented pickers, each `label / value ▾`; label `--fs-xs` uppercase `text-faint`, value `--fs-base` weight 500. Company value shows `name` sans and `id` mono dim. Divider hairline between pickers. Right side: preset chip (`Mars · 234474 · DSR-1`), density toggle (`Comfortable` / `Dense`, remembered), theme toggle, user avatar (`surface-3` fill, initials; never a gradient).

## Lead sentence

Directly under every page title: one plain sentence, `--fs-base`, `text-dim`, max 80ch, that says what the page covers and in which scope ("API coverage, test cases, flows, and data validations across 9 modules · Mars Wrigley VN · Beta · August 2026"). It is content, not decoration: a newcomer reads it and knows what the numbers mean.

States: `resolving` (value skeleton while token is fetched), `stale` (warn dot: token expired, click to refresh), `locked` (a run is in progress; pickers disabled with tooltip "Stop the run to change scope").

Changing any picker re-renders the current view in the new scope with `focus-pull` on the content region only.

## Drawer (navigation) = NavTree

The drawer is a **reusable tree component driven by a data model**, not hand-written rows. Any pack contributes items; the renderer knows nothing about a specific module. The same component renders the module tree, the footer (Suites with children), and can render any settings or panel side-nav.

**Model**

```
sections: [{ id, label, items: [{ id, icon, label, badge, health, href|action, children?: [item] }] }]
```

A module is an item; its testing types are its children. Suites is a footer item whose children are the suites. Health and badge roll up from the data, never typed by hand.

**Layout**: left, `surface-1`, width 260px by default, **resizable** by a drag handle on the right edge (200–380px, double-click resets), collapsed to 56px with the header button, `[`, or a double-click on the header. Width, open/closed state, pins, and recents are remembered per user.

Top to bottom:

- **Header**: logo mark + wordmark + collapse button.
- **Filter field**: typing filters the tree live (module and type labels, matches highlighted, matching modules auto-expand, empty state points to ⌘K). `Esc` clears. The `⌘K` chip opens the CommandPalette (which searches endpoints, runs, companies too). `↓` from the field moves focus into the tree.
- **Company entry**: ApertureRing in the company verdict color, name with a ▾, `id · N modules · N failing`. Click the row → company page. Click the name → **company switcher** dropdown (searchable list of companies with tenant and id, current one checked, "Manage companies…").
- **Sections**: `Pinned` (★ per user) · `Recent` (last 3 modules visited) · one section per pack category. Section header: caret + uppercase label + count; click collapses; state persisted. Hidden while filtering (only category sections show).
- **Module row** (34px): chevron (rotates 90° when open) · icon · name · summary in mono (`3 fail` crit-text, `gaps` warn-text, `ok`, `no runs`) · ★ pin on hover · health dot. Click the row → module Overview and expands it. Click the chevron → expand/collapse only. Expanded rows reveal **child rows** (30px, indented, dot + type name + summary) for the five testing types; the active type is highlighted. Children open with `dopen` (opacity + 4px slide).
- **Footer**: Suites (expandable: each suite as a child with verdict), Runs, Suggestions (count), Settings, then a **user row** (avatar in `surface-3`, name, role, ⋯) that opens the user menu: Theme (Light / Dark / System), Density (Comfortable / Dense), Keyboard shortcuts, Sign out.

**Active state**: `accent-soft` fill + 2px accent bar at the left edge, on the module row when its Overview is open, on the child row when a type is open.

**Collapsed (56px)**: icons only, children and sections hidden (thin separators between categories), health dot on the icon corner, tooltips carry the name. Hovering a module opens the **flyout** with its types and Run smoke / Open failures.

**Keyboard** (focus inside the tree): `↑ ↓` move between visible rows, `→` expands a module or enters its children, `←` collapses or returns to the parent, `Enter`/`Space` activates, `*` pins. Rows are `role="treeitem"` with `aria-expanded`.

**Motion**: chevron rotate `--d-fast`; children `dopen` `--d-base`; width changes `--d-base` (the one sanctioned width transition). Reduced motion: instant.

## Module flyout

Appears on hovering a module row (delay 0, hides 180ms after leaving row or flyout). 300px card, `--el-2`, opens with `palette` motion beside the row. Contents: module name + verdict badge, a 2-column grid of the five testing types (dot, name, summary), and two actions: `Run smoke` (accent) and `Open failures` (ghost, jumps to the worst type). Clicking a type opens that tab directly. Keyboard: focus a module row and press `→` to open the flyout, arrows to move, Enter to open.

## Matrix (company)

`surface-1` card. Rows = modules grouped under category header rows (28px, ground fill, uppercase label). Columns = testing types + p95. First cell: icon, module name, rolled-up health dot. Verdict cells are 26px chips, mono, min-width 88px: `ok` / `warn` / `crit` tints, `none` outlined for `—` or `no runs`, `running` flare tint with a live dot during Run all. Hover lifts the chip 1px with aberration fringe. Cell click → module tab; row click → module Overview. Tenant mode swaps the type columns for the six tenants and shows module verdicts per tenant; cell click opens the module in that tenant's scope.

## Tabs (module page)

Height `--tabs-h`. Tab: `--fs-base` weight 500, `text-dim`, padding 0 14px. Active: `text`, 2px underline in `accent` that slides between tabs (`tab-slide`). A 6px health dot precedes the label on tabs that carry a verdict. Optional count chip (mono) after the label: `Cases 42`, `Runs 128`. Order is fixed: Overview · APIs · Cases · Flows · Validations · Load · Runs · Data · Knowledge.

## Tile (summary)

Purpose: verdict-first numbers. Only for figures that are the point of the screen.

Anatomy: card `surface-1`, radius `--r-md`, padding `--card-pad`, min-height `--tile-min`. Label `--fs-sm` sentence case `text-dim`. Number `--fs-2xl` display face, tabular digits, `count-up` on load. **One** sub line `--fs-sm`: either the "worst offender" (`worst: F1 OrderInRevenue`) or the delta (`▲ 3 since last run`) in `ok-text`/`crit-text`, never both. `ApertureRing` only on the primary tile.

Variants: `neutral`, `ok`, `warn`, `crit` (number in the `-text` color + 3px left stripe in the strong color). Clickable tiles filter the table below and show a pressed fill `surface-3`. Four tiles per row on desktop, two below `md`.

## ApertureRing (signature)

A 40px SVG ring, stroke 3px, that draws closed as a run completes (`aperture` motion), then fills with the verdict color. Idle: ring in `hairline`. Running: ring in `flare`, dashoffset animating. Done: ring in ok/warn/crit, center dot same color. Used on the primary tile, the run header, and the rail module dot (at 8px, no draw animation).

## Table

Header: fill `surface-2`, sticky, `--fs-xs` uppercase `text-dim`, height `--th-h`, sortable columns show ▲▼ on hover. Default column set is the 6–8 a reader needs; the rest are `opt` columns behind a `Columns · 7 of 11` picker in the toolbar (choice remembered per user). Rows: height `--row-h` (44 comfortable / 36 dense), cell padding `--row-pad`, separator `hairline-soft`, hover fill `surface-3` + aberration fringe on the row. Selected row: 2px `flare` bar on the left edge, fill `flare-soft` at 50%. Verdict rows: `crit` rows get `crit-soft` fill; `warn` rows `warn-soft`; info rows `info-soft`. Three-state tinting is mandatory: a row with only warnings must look different from a row with a mismatch and from a clean row.

Cells: text `--fs-sm`; ids, counts, dates in `--font-mono` tabular. Entity cell is two lines: name (sans) / `ERP code · ID 12345` (mono, dim). Never one ambiguous bracketed line.

Rows enter with `reveal` (stagger 30ms, max 12). Expand-in-place is not used; drill-down goes to the FocusPanel.

Toolbar above table: search (ids only, mono), filter chips (`All · Issues only · OK only` + tile-driven filters), density toggle, column picker, Export.

Empty state inside table: one sentence + primary action, centered, 48px padding. Loading: 8 skeleton rows.

## FocusPanel (drill-down)

Right panel, width `--panel-w`, fill `surface-1`, elevation `--el-2`, pushes content (content region shrinks; no overlay). Opens with `focus-pull`. Header: breadcrumb (`Van Sales › Cycles › Cycle 14 › Product 106547`), title `--fs-lg`, close ✕, actions (Rerun, Share, Download this cycle). Body scrolls independently. Deeper levels replace the body with `focus-pull` again; breadcrumb grows; `Esc` or `←` goes one level up; closing the panel restores the table's scroll and selected row.

Panel is deep-linkable: the URL always encodes the full drill path.

## StepCard (flow timeline)

The flow is a vertical timeline of StepCards connected by a 2px line on the left (the data line).

Anatomy: 24px node on the line (idle: hairline circle; running: flare with `pulse-live`; pass: ok check; fail: crit ✕; skipped: dashed) · card `surface-1` radius `--r-md` · header row: method chip (mono, colored: GET accent, POST ok, PUT warn, DELETE crit; DB steps show `SQL` in info) + path in mono + duration mono right-aligned · body rows: `extract` (`token ← $.data.token`), `assert` list with per-assert badge · footer: expand chevron.

Data lines between cards carry `refract` pulses while running. Extracted variables draw a thin labeled connector from the producing step to the consuming step on hover of either.

Fail state: card border `crit`, `pulse-once`, body auto-expands to show request / response / assertion diff (three collapsible mono blocks with `code-bg`).

Editing: the card is also the editor; fields become inputs in place. A YAML pane on the right mirrors the timeline, two-way.

## EndpointRow / Workbench

APIs tab list row: method chip · path mono · summary sans dim · coverage chip (`3 cases · 2 flows` or `no tests` in warn) · p95 mono · last-run badge. Click opens the Workbench in the FocusPanel: request editor (headers auto from context, body pre-filled from schema, tabs Params / Body / Headers / Auth), **Send** (primary), response viewer (status badge, time mono, JSON tree with search, Raw, Diff vs last, Save as example, Save as case). History strip under the editor: last 10 sends as small badges with time.

## CaseRow

Cases tab: name · kind chip (`happy`, `negative`, `security`, `boundary`, `manual`) · endpoint mono · last verdict badge · tenant parity mini-grid (6 dots) · owner. Bulk select + Run selected.

## RunStrip

A row of 30 small bars (last 30 runs), height 24px, each bar 6px wide, gap 2px, color by verdict, hover shows tooltip with date and counts, click opens that run. Endpoint stroke on the latest bar. Used in Overview and on every flow header.

## FlowMap (sync)

Card with an SVG (700×230 viewBox, responsive). Nodes: 160×44 rounded rects in `surface-2` with `hairline` stroke, name in UI 12.5px semibold, dialect/db line in mono 10.5px dim; hover stroke `accent` + aberration fringe; clickable and focusable. Edges: cubic paths, stroke 6px (8 on hover), color by status (`ok` / `warn` / `crit`; `soon` = hairline dashed 3px, not clickable); a self-loop for intra-source checks. Edge label: pill (`surface-1` fill, hairline stroke) with mono text in the edge color, centered on the edge midpoint. While a run is live, edges use `flowdash` (moving dash). Legend under the SVG. Reduced motion: no dash animation.

## HopStepper (sync chain)

Horizontal, scrolls inside its container. **Hop card**: `surface-1`, radius md, eyebrow `source · hop N`, table name mono (ellipsis with title), count in display face `--fs-xl`, one-line note, 4px bar relative to the entry count (ok / warn / crit fill). Selected hop: inset 1px `accent`. **Gap** between hops: 92px, hairline rule through the middle, a pill `−N` in the drop's severity color and a tiny cause word under it. Both hop and gap are clickable and filter the failure grid. On run, bars fill left to right over `--d-cinematic` each.

## FailureGrid (sync)

The standard Table with these conventions: first column is the key as a two-line entity (`#id` mono copyable / `guid …` dim), source value and target value are adjacent mono columns, Δ column gets `crit-soft` when non-zero, severity uses the `sev` mark (8px square + uppercase word: critical crit, high flare, medium warn, low dim), cause uses the `cause` pill, last column is a workflow status select. A banner above names the rule, the row count, the evidence expiry, and holds `Export CSV`. Truncated results show a warn banner ("showing first 50,000 · narrow your range").

## EvidencePanel (sync)

FocusPanel body for one failing row: expiry row (run id, bar, time left) → identity block (`surface-2`, 2-column key/value, mono values, copy on click) → comparison table (`Field · source table · target table`; differing rows tinted `crit-soft` on both value cells with a 2px crit edge on the source cell; missing side shows dim "no row") → one-sentence read → actions. Expired: identity block stays, comparison greyed with a centered "evidence expired · re-run to refresh", primary `Re-run this rule`. Never render "no evidence" for a row that has data.

## RuleCard and IssueRow (sync)

RuleCard: grid `type chip · name · [severity, verdict badge, enabled toggle, Preview SQL]` with a mono meta line (id, scope, last run, rows). Type chip (`rtype`): mono 10.5px, `info-soft`, fixed 110px so the column aligns. IssueRow: severity mark, category pill (Missing / Duplicate crit-tinted, Mismatch / Aggregate warn-tinted), chain id mono, where (table → table) mono, rows, first seen, status select. Resolved rows untinted.

## SuggestionCard (AI)

Card with a left 3px `info` stripe. Header: source chip (`from spec`, `from bug DASH-284`, `from record`) · confidence dots · created time. Body: what it checks, one sentence why. Preview run result badge. Footer: **Accept** (accent), Edit, Discard (ghost). Accepted card animates out with `settle` into the target tab counter.

## CommandPalette

`Cmd/Ctrl+K`. Centered, width 640px, elevation `--el-3`, radius `--r-lg`, opens with `palette` motion over `overlay` with backdrop blur 6px. Input `--fs-md`. Results grouped: Actions (Run…, New…), Endpoints, Flows, Runs, Companies. Each row: icon · label · shortcut/mono meta. Arrow keys, Enter, Esc. Typing an id (all digits) jumps the Companies/Employees group to the top.

## Toast

Bottom-right, `surface-2`, `--el-2`, radius `--r-md`, 12px 14px, icon in verdict color, text `--fs-base`, optional action link in `accent`. Enters with `toast` (spring). Auto-dismiss 5s unless it has an action. Never more than 3 stacked.

## Skeleton

Blocks in `surface-3` with `shimmer` sweep. Shapes match the real component (row height, tile height). Never a spinner for content areas; spinners are only inside buttons.

## Tooltip

`surface-3`, 1px hairline, `--fs-sm`, radius `--r-xs`, 6px 8px, delay 300ms, fade `--d-fast`. Contains the full reason text that a badge abbreviates.

## Diff block

Two mono columns (`expected` / `actual`) in `code-bg`, changed tokens highlighted `crit-soft` (removed) and `ok-soft` (added). Numeric diffs show the delta in mono to the right (`Δ +1`).

---

## Implementation checklist

- [ ] Both themes rendered and checked; no color literal outside the token file.
- [ ] Every interactive row has hover fringe, focus ring, and keyboard activation.
- [ ] Verdict badge, row tint, and tile color agree for the same record.
- [ ] Ids/numbers mono + tabular; entity cells two-line.
- [ ] Table, panel, and page never scroll horizontally as a whole; wide content scrolls inside its container.
- [ ] Loading, empty, error, populated states exist for every data region.
- [ ] `prefers-reduced-motion` collapses all motion per `motion.md`.
- [ ] Primary (flare) button appears at most once per screen.
- [ ] FocusPanel path is in the URL; refresh restores it.
