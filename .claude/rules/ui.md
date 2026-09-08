---
paths:
  - "packages/web/**"
  - "packages/ui/**"
  - "docs/design/**"
---
# UI work

The design contract in `docs/design/` is binding. Read the section the unit names (`design:` in its frontmatter) and open `docs/design/prototype/index.html` for the visual truth.

- Tokens only: colors, spacing, radius, row heights come from `tokens.css`; Stylelint fails the gate on raw literals.
- Text on a tinted fill uses the `-text` token; strong colors are for fills, dots, bars, and large numbers.
- Every data region has four states: loading (skeleton), empty (one sentence + one action), error (what happened + how to fix), populated. A component with fewer is not done.
- Drill-down opens the focus panel and pushes content; the URL carries the full path; refresh restores it.
- Motions come from `motion.md` by name; animate only transform, opacity, filter, stroke-dashoffset; respect reduced motion.
- Take screenshots in light and dark, comfortable and dense, and save them under `evidence/U-xxx/`; the design-reviewer compares them to the prototype.
- If the design contract is missing something you need, change the contract in the same PR and say so in the PR body; do not invent a one-off.
