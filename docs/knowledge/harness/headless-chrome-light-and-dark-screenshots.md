# Capturing light and dark screenshots with headless Chrome

`chrome --headless=new --screenshot` alone always renders with the default (usually light) color scheme — there is no CLI flag to pick `prefers-color-scheme`. Passing `--force-color-profile` or similar display flags does not touch the media-query state either.

The reliable recipe is a small CDP (Chrome DevTools Protocol) script: launch with `--headless=new --remote-allow-origins=*` (Chrome rejects DevTools connections without this flag), open a tab, call `Emulation.setEmulatedMedia` with `features: [{name: "prefers-color-scheme", value: "light"}]` (or `"dark"`), then navigate and capture. Run it twice per page to get both themes, e.g. `<tab>-light.png` and `<tab>-dark.png`.

The capture script itself lives outside this repo (evidence-generation tooling, not product code); this note is the recipe to reproduce it, not a pointer to a checked-in file.

Source: U-002, 2026-09-09 (design reviewer, round 1: dark-only screenshots flagged, fixed with 18 light+dark pairs)
