# FA Lens Design Contract

This folder is the **complete visual and interaction specification** of FA Lens. It is written so that a Claude session (or a human) with no prior context can implement any FA Lens screen, in any stack, and get the same result.

**If you are a Claude session asked to build FA Lens UI, read in this order and do not skip:**

1. `tokens.json` — identity, colors (dark + light), type, space, radius, elevation, motion, layout. Machine-readable. `tokens.css` is the same thing as CSS custom properties; copy it verbatim into a web stack, or translate it 1:1 into your stack's theme object (Flutter `ThemeExtension`, Tailwind `theme.extend`, CSS-in-JS, etc.).
2. `components.md` — every component: anatomy, variants, states, which token goes where.
3. `motion.md` — every named animation: trigger, meaning, duration, easing, reduced-motion fallback. The signature motions (`focus-pull`, `aperture`, `cascade`, `refract`) are what make FA Lens feel like FA Lens. Implement them exactly.
4. `screens.md` — every screen: layout regions, components per region, and the four states (loading, empty, error, populated).
5. `interaction.md` — keyboard map, command palette, drill-down and back rules, share links, focus order.
6. `prototype/index.html` — a live, dependency-free reference. Open it in a browser. It is the visual truth for spacing, color, and timing. When the docs and the prototype disagree, the prototype wins and the doc must be fixed. Its **Scenarios** button (top right) plays five scripted walkthroughs: validator drill-down, tester workbench, contributor flow run, company release run with tenant compare, and the command palette. Watch them before building; they define the intended paths.

## Navigation in one line

**Company → Module → Testing type.** The drawer lists the company and its modules grouped by category; the company page is a matrix of modules × testing types; a module page is one row of that matrix as tabs. Verdicts roll up from type to module to company. Van Sales is only the first pack; the shell knows nothing about it.

## Identity in one paragraph

FA Lens is optics. The tool exists to bring truth into focus. **Light is the default theme** (readability decision, 2026-09-09): cool white ground, white cards, ink text. Dark is a full twin ("darkroom") for people who prefer it. One cool accent, **Iris** (`#0B84D6` light / `#4FD1FF` dark), carries all navigation and interaction. One warm color, **Flare** (`#E8562F` / `#FF7A59`), is reserved for the single thing that is active right now: the primary button and the running state, nothing else. Together they mimic a lens's chromatic aberration, and that cyan/orange fringe is the tool's signature hover detail. Verdict colors (ok, warn, crit) are semantic, never decorative, and never used as accent; **text on a tinted fill always uses the darker `-text` token**, so pills and badges read calmly. Type: Bricolage Grotesque for display (page titles and big numbers only), **Plus Jakarta Sans** for UI, JetBrains Mono for every id and number.

## Readability rules (learned from the recon dashboard)

- Hue budget per screen: accent + ok/warn/crit. Flare only on the primary button and running state. Info only inside a badge.
- One idea per card: a sentence-case label, one number, one "worst offender" line. Delta and ring only on the primary tile.
- Every page title has a one-sentence lead in plain words that says scope and meaning.
- Density is a mode: **Comfortable** (default: 44px rows, 20px card padding, line-height 1.55) and **Dense** (36px rows) behind a toggle, remembered per user.
- Tables default to the 6–8 columns a reader needs; the rest live behind a Columns picker.
- Uppercase letter-spaced labels only in table headers. Everywhere else, sentence case.

## Non-negotiable rules

- No raw hex in components. Tokens only. Both themes always; light is the default.
- Verdict first, detail second, on every screen. The most important number is the largest thing.
- Three inputs to a result, two clicks to drill down. If a screen needs more, the screen is wrong.
- Drill-down opens a right **focus panel** that pushes content. Never a modal for data. Breadcrumb always visible. Back always restores scroll and selection.
- Never an empty screen. Loading = skeleton shimmer. Empty = one sentence + one primary action. Error = what happened + how to fix.
- Every result shows *when it ran* and *how much data it looked at*.
- Ids and numbers are monospace with tabular figures. Names are sans. A reader must never wonder which number is the id.
- Motion animates only `transform`, `opacity`, `filter`, `stroke-dashoffset`. Respect `prefers-reduced-motion`. No animation ever blocks input.
- Keyboard-first: everything reachable without a mouse; `Cmd/Ctrl+K` opens the command palette everywhere.
- Density is high; whitespace separates groups, not elements. This is a working tool, not a marketing page.

## Recipe: "implement screen X in stack Y"

1. Load tokens into the stack's theme system. Verify both themes render (toggle `data-theme` or the OS setting).
2. Build the primitives from `components.md` in this order: Badge, Button, Input, ContextBar, Tabs, Table, Tile, FocusPanel, StepCard, CommandPalette, Toast, Skeleton.
3. Implement the motions from `motion.md` as named, reusable animations (CSS keyframes, Flutter `AnimationController`s, Framer Motion variants). Names must match the doc.
4. Compose the screen from `screens.md`, all four states.
5. Check against `prototype/index.html` side by side: spacing, color, timing.
6. Run the checklist at the bottom of `components.md`.

## Provenance of the data-sync screens

The sync module's UI concepts (source flow map, chain hop stepper, failing-rules → failure grid with source-vs-target diff, evidence panel with identity block and expiry, flat issues worklist with workflow status, five declarative rule types with SQL preview) are deliberately modeled on the proven recon dashboard the team already uses. Only the interaction concepts were taken; tokens, components, and the architecture underneath are FA Lens's own. Deep links work in the prototype: `index.html#/module/sync/flows`.

## What this folder is not

It is not a component library and not a stack decision. Stack is chosen in `docs/adr/`. This folder only says what the result must look like and feel like.
