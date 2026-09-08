# Interaction

## Keyboard map (global)

| Keys | Action |
|---|---|
| `Cmd/Ctrl + K` | Command palette |
| `/` | Focus the current tab's search |
| `Cmd/Ctrl + Enter` | Run (the primary action of the current tab) |
| `Cmd/Ctrl + Shift + Enter` | Run selected / matrix run |
| `1` … `8` | Switch module tab (Overview … Knowledge) when focus is not in an input |
| `↑ ↓` | Move selection in the active table or list |
| `Enter` | Open selected row in FocusPanel |
| `→` | Drill one level deeper (if the selected row has a deeper level) |
| `← ` or `Esc` | One level up; `Esc` at level 1 closes the panel |
| `Cmd/Ctrl + C` on a row | Copy the row's primary id |
| `Cmd/Ctrl + Shift + C` | Copy share link for the current view (including panel path) |
| `Cmd/Ctrl + E` | Export the current table |
| `Cmd/Ctrl + \` | Toggle YAML pane on Flows |
| `Cmd/Ctrl + .` | Toggle theme |
| `[` | Collapse / expand the sidebar |
| In sidebar: `↑ ↓` | Move between rows |
| In sidebar: `→` / `←` | Expand a module into its testing types / collapse or go to parent |
| In sidebar: `*` | Pin or unpin the focused module |
| `?` | Show this map |

Focus order: ContextBar → module header primary button → tabs → tab toolbar → table → FocusPanel. Focus never gets trapped except inside the palette and dialogs.

## Command palette grammar

Typing selects a group by shape:
- All digits (`234474`) → Companies / Employees first, "Set company 234474" as the top action.
- Starts with `/` or contains `/` (`day/begin`) → Endpoints first.
- Starts with `run ` → Actions: `run <flow name>` with fuzzy match; Enter runs in the current context.
- Starts with `>` → Actions only (New flow, New case, Import Postman, Switch tenant…).
- Otherwise fuzzy across all groups, Actions last.

Each result row shows its meta in mono (id, path, shortcut). Recent items pinned at the top when the input is empty.

## Context and scope

- Scope = Env · Tenant · Company · User. It is global state, shown in the ContextBar, encoded in the URL (`?env=beta&t=mars&c=234474&u=dsr1`).
- Changing scope re-runs nothing automatically. It re-renders lists (catalog, cases, flows, runs) for the new scope and clears results that belonged to another scope, with a toast "Scope changed to Mars · 234474".
- A running job locks the scope. The lock is visible and explains itself.
- Presets are named scopes. Presets are per user, shareable by link.

## Drill-down and back

- Levels are explicit: table row → L1 → L2 → … Each level is a URL segment (`/van-sales/validations/cycles/14/products/106547`).
- Opening a level never loses the table: the table stays, the panel pushes it. Closing restores the table's scroll position and selected row.
- Breadcrumb in the panel header is clickable; each crumb is a link.
- Refreshing the browser at any depth restores the same view, including the run it belongs to (run id in URL).
- Back button (browser) = one level up, same as `Esc`.

## Share links

- Every view has a share link: scope + tab + filters + panel path + run id. `Share` copies it and shows a toast "Link copied".
- Links to a run are permanent (ledger). Links to a live view without a run id re-run nothing; they open the same filters and show the latest stored run for that scope.
- A validator role opening a link to a draft flow sees "This flow is not published yet" with the owner's name, not a 404.

## Running

- One primary button per tab. Its label is the verb: `Run`, `Send`, `Run selected`, `Accept`.
- Pressing Run streams status into a single status line under the primary button ("Fetching VanDayStocks · 1,200 rows · 2.1 s"), never a modal spinner.
- `Stop` replaces Run while running. Stopping keeps partial results and marks the run `stopped`.
- Results always carry: started at, duration, rows looked at, scope, flow version, who.

## Editing flows and cases

- Editing happens in place on the StepCard or CaseRow; no separate "edit mode" page.
- Every edit is a draft until `Save`. Unsaved drafts show a dot on the tab and survive a refresh (local storage).
- `Save` runs validation first: schema, missing vars, unreachable steps, write attempt against a read-only source. Errors appear on the offending card, not in a global banner.
- Published vs draft: drafts are visible only to contributors and the owner. Validators see published only.

## Suggestions (AI)

- Suggestions never modify a module directly. They live in the inbox until Accept.
- Accept → the item is created as a draft in the module (still needs Save/Publish by a contributor with rights).
- Discard asks for an optional one-word reason (`wrong`, `duplicate`, `later`) that trains nothing automatically but is stored with the suggestion.
- Every AI output carries its source (spec, record, bug id, prompt) and the model name, visible on hover.

## Errors and safety

- A write attempt against a read-only source is blocked at the adapter and shown on the step card as `BLOCKED · read-only source`. It is a verdict, not an exception.
- Auth failures show what scope they belong to and offer `Refresh token` inline.
- Network or timeout errors on a step keep the step `error` (distinct from `fail`) so a flaky network is never counted as a product failure.

## Density and responsiveness

- Default row 36px; `dense` toggle 30px, remembered per user.
- Below `md`: rail icons only, panel full-width with a back bar, tiles 2-up, tables horizontally scroll inside their container.
- Text never truncates without a tooltip carrying the full value.
