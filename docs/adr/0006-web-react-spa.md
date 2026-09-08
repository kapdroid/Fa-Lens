# ADR-0006 — Web: React SPA with TanStack and Motion

Status: accepted · Date: 2026-09-09

## Context

The web app lives behind login; there is no SEO. It must implement the design contract exactly: deep-linkable Company → Module → Type navigation, a focus panel that pushes content, virtualized tables of up to 50k rows, and the four signature motions at 60 fps. Claude sessions will build most of it from `docs/design/`.

## Decision

`@falens/web` is a **React 19 + Vite SPA**. Routing and URL state: **TanStack Router** (typed search params carry scope, filters, and the panel path). Data: **TanStack Query** with ETag-aware fetch, SSE subscriptions for runs. Tables: **TanStack Table + Virtual**. Motion: **Motion** (framer-motion) for `focus-pull`, `cascade`, layout transitions; CSS keyframes for the small ones. Forms: react-hook-form + the shared Zod schemas. No Next.js, no SSR.

## Alternatives considered

- **Next.js App Router.** SSR/RSC solve problems this app does not have and complicate SSE, motion, and client state. Rejected.
- **Vue/Nuxt (FA dashboards use Vue).** Viable; rejected because the shared Zod contract, TanStack stack, and Claude's output quality are strongest in React, and the web team here is small.
- **Server-driven UI.** Rejected: the design contract is component-first and interaction-heavy.

## Consequences

- The URL is the state: `?env&t&c&u` + `/company/:id/modules/:m/:tab/…panel…`. Refresh restores everything, including the drill path (interaction.md).
- Bundle discipline: route-level code splitting; the flow editor and YAML pane are lazy.
- Motion budget is enforced by a Playwright frame-timing check on the run page.

## How we verify

Playwright suites per screen in `docs/design/screens.md` assert the four states (loading, empty, error, populated) and deep-link restore. A performance test scrolls a 50k-row table and asserts no long task > 50 ms; the run page cascade keeps ≥ 55 fps on the CI machine baseline.
