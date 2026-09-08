# Motion

Every animation in FA Lens has a name, a trigger, and a meaning. If a proposed effect has no meaning from the four below, it is not added.

Meanings: **feedback** (you did something), **continuity** (you went somewhere), **attention** (something changed), **delight** (you waited, here is a reward).

Tokens: durations and easings from `tokens.json` → `motion`. Budget: 60fps; animate only `transform`, `opacity`, `filter (blur ≤ 8px)`, `stroke-dashoffset`; `box-shadow` only on hover states.

Reduced motion (`prefers-reduced-motion: reduce`): every entry below collapses to the fallback listed. Nothing loops.

---

## Signature motions

These four define the feel. Implement them exactly; they are what a user remembers.

### `focus-pull` — continuity (drill-down)
- Trigger: opening a FocusPanel level, or changing scope in the ContextBar.
- Meaning: you brought something into focus. The rest went soft.
- Incoming content: `filter: blur(8px) → 0`, `opacity .0 → 1`, `transform: translateX(12px) → 0`. Duration `--d-slow`, easing `--e-enter`.
- Outgoing (the level you left, still visible behind in the breadcrumb sense): `filter: blur(0 → 4px)`, `opacity 1 → .0`, duration `--d-base`, easing `--e-exit`, then removed.
- Source row: keeps its selected state (flare bar) while the panel is open; on close, the row briefly gets `settle`.
- Panel width change pushes the content region with `transform` on a wrapper, not `width`, over `--d-slow`.
- Back: same, mirrored (translateX −12px).
- Reduced: opacity 120ms.

### `aperture` — attention (verdict arrival)
- Trigger: a run completes; on the ApertureRing.
- Meaning: the lens closed; the verdict is final.
- Ring `stroke-dasharray` = circumference; `stroke-dashoffset` animates from full to 0 over `--d-cinematic` with `--e-standard`, stroke color `flare` while drawing. At completion the stroke color crossfades to the verdict color over `--d-fast` and the center dot scales in with `--e-spring`.
- On the same frame the tile number starts `count-up`.
- Reduced: render final ring and number instantly.

### `cascade` — attention (flow run)
- Trigger: a flow run starts; on the StepCard timeline.
- Meaning: steps execute in order; the failure is exactly where the light stopped.
- Each StepCard node goes idle → running (flare + `pulse-live`) → pass/fail as results arrive. If results arrive faster than `--stagger-step`, the UI still reveals them at `--stagger-step` intervals so the eye can follow. On fail: `pulse-once` on the card, cascade stops, remaining nodes turn to `skipped` (dashed) together with a single `--d-fast` fade.
- The data line segment between two cards fills with the verdict color from top to bottom (`stroke-dashoffset`) as the next step starts.
- Reduced: states switch instantly; no stagger.

### `refract` — delight (waiting on a run)
- Trigger: while any step is `running`; on data lines and on the ApertureRing.
- Meaning: light is travelling through the flow.
- A 24px dash of `flare` fading to transparent moves along the data line, `stroke-dashoffset` loop, 1.2s linear, one dash per line. Node halo: `pulse-live`.
- Stops the moment the step resolves.
- Reduced: off; node shows a static flare fill.

---

## Standard motions

### `press` — feedback
Buttons, chips, tiles on pointer down: `transform: scale(.97)`, `--d-instant`, release with `--e-spring` over `--d-fast`. Reduced: none.

### `reveal` — continuity (content arrival)
Table rows, list items, cards on first render: `opacity 0 → 1`, `translateY(6px) → 0`, `--d-base`, `--e-enter`, stagger `--stagger-row`, capped at 12 items (later rows appear without delay). Elements must have a visible resting state if JS fails: the animation is additive, the initial style is not `opacity: 0` in CSS; the class is applied by the renderer at mount. Reduced: opacity only.

### `count-up` — attention
Tile numbers from 0 (or previous value) to value over 600ms, `--e-standard`, integers only, mono digits so width does not jump. Reduced: instant.

### `pulse-live` — attention (in progress)
Flare halo on a node: `box-shadow 0 0 0 0 flare-soft → 0 0 0 8px transparent`, 1.4s, infinite while running. Reduced: static flare ring.

### `pulse-once` — attention (failure)
Card: `transform scale(1 → 1.012 → 1)` and border `crit` fade-in, 360ms, once. Reduced: border only.

### `settle` — feedback (return / accept)
Row or card after an action completes: `background flare-soft → transparent` over `--d-slow`. Also used when a suggestion is accepted (card collapses height via `transform: scaleY` on a wrapper + opacity, then the target tab counter ticks up).

### `tab-slide` — continuity
Active tab underline translates to the new tab, `--d-base`, `--e-standard`. Content region crossfades `--d-fast`. Reduced: instant.

### `shimmer` — delight (loading)
Skeleton blocks: a 40% wide gradient highlight (`surface-3 → hairline → surface-3`) sweeping left to right, 1.6s, infinite, via `background-position` on a fixed-size gradient (cheap) or `transform` on a pseudo-element. Reduced: static block.

### `palette` — continuity
CommandPalette: panel `opacity 0 → 1`, `scale(.98) → 1`, `--d-fast`, `--e-enter`; scrim fades with backdrop blur 6px. Close mirrors with `--e-exit`. Reduced: opacity.

### `toast` — attention
Toast enters from `translateY(16px)` with `--e-spring` over `--d-slow`; exits `translateY(8px)` + opacity over `--d-fast`. Reduced: opacity.

### `aberration` — feedback (hover)
Rows, cards, endpoint rows: `box-shadow` none → `--aberration`, `--d-fast`. Reduced: kept (no movement).

### `rail-expand` — continuity
Rail width via `transform: translateX` on labels + a width transition on the rail only (the single sanctioned width animation, `--d-base`); content does not reflow, it is overlaid. Reduced: instant.

---

## Orchestration on a run page (the moment)

When the user presses **Run**:

1. Button enters loading. ContextBar locks (`--d-fast`).
2. Timeline: `cascade` begins; data lines `refract`.
3. Tiles show skeleton numbers; ApertureRing turns flare and starts `refract` halo.
4. On completion: `aperture` draws closed → verdict color → `count-up` on all tiles simultaneously → rows `reveal`.
5. If pass: one 400ms burst of 12 tiny `ok` particles from the ring center (transform + opacity, Canvas or 12 spans). Once. Never on fail. Never on re-render.
6. Toast: "Run 128 finished · 3 mismatches" with action "Open".

Total added latency from motion: ≤ 700ms after data arrival. Nothing in this sequence blocks clicking a row that is already visible.
