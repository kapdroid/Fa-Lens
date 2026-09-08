# ADR-0007 — Tokens-only CSS, linted; the design contract is binding

Status: accepted · Date: 2026-09-09

## Context

`docs/design/` defines tokens (light default, dark twin), components, motion, screens, and interaction, written so any Claude session can implement them in any stack. The failure mode of every design system is drift: a raw hex here, a hardcoded row height there.

## Decision

Styling is **plain CSS Modules** consuming `docs/design/tokens.css` (copied verbatim into `@falens/ui/tokens.css`, kept in sync by a CI diff). **Stylelint** rules forbid raw color literals, raw px for spacing/radius/row heights, and `!important`; only `var(--…)` is allowed for those properties. No Tailwind, no CSS-in-JS runtime. `@falens/ui` exposes the primitives and patterns listed in `components.md` with the states and motions from `motion.md`; views compose them and never fork a pattern locally. Density (`data-density`) and theme (`data-theme`) are root attributes; components never branch on them in JS.

## Alternatives considered

- **Tailwind.** Fast to write, but utility classes are a second design language that bypasses tokens; enforcing "tokens only" becomes a losing review battle. Rejected.
- **vanilla-extract / CSS-in-TS.** Type-safe tokens are attractive; rejected for v1 to keep the CSS identical to the design contract's CSS and readable by non-TS contributors.
- **shadcn/ui.** Good primitives, but they bring their own tokens and Tailwind. Rejected.

## Consequences

- A Claude session can copy component CSS from the prototype almost verbatim.
- New visual needs go through the design contract first (PR to `docs/design/`), then `@falens/ui`, then views.
- Both themes and both densities are tested for every component story.

## How we verify

`pnpm lint:tokens` (Stylelint) fails on any raw literal. A CI job diffs `docs/design/tokens.css` against `packages/ui/tokens.css`. Storybook stories exist for every component in `components.md`; Playwright snapshots run in light + dark × comfortable + dense. `docs/design/components.md` checklist is part of the PR template for UI work.
