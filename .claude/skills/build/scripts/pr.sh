#!/usr/bin/env bash
# PR step: render the PR body from the template + unit + evidence summary, push the unit branch, open the PR.
# Never merges. Refuses to run on main. Requires `gh auth status` to succeed.
#   pr.sh U-012 --dry-run   → renders the body to evidence/U-012/pr-body.md, pushes nothing, opens nothing.
set -euo pipefail
ID="${1:?unit id}"; DRY="${2:-}"
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
BR="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BR" == unit/* ]] || { echo "pr: current branch is $BR; PRs open only from unit/ branches" >&2; exit 1; }
[[ -z "$(git status --porcelain | grep -v '^?? .falens-unit$')" ]] || { echo "pr: working tree is dirty; commit or drop changes first" >&2; exit 1; }
[[ "$DRY" == "--dry-run" ]] || gh auth status >/dev/null 2>&1 || { echo "pr: gh is not authenticated; a human must run gh auth login" >&2; exit 1; }
FILE="$(ls docs/plan/units/"$ID"*.md | head -1)"
TITLE="$ID: $(grep -m1 '^title:' "$FILE" | cut -d' ' -f2-)"
SUMMARY="evidence/$ID/summary.json"
BODY="$(mktemp)"
{
  echo "## Unit"
  echo "- Unit: \`$ID\` — \`$FILE\`"
  echo "- Tier: $(grep -m1 '^tier:' "$FILE" | cut -d' ' -f2) · Kind: $(grep -m1 '^kind:' "$FILE" | cut -d' ' -f2)"
  echo "- ADRs checked: $(grep -m1 '^adrs:' "$FILE" | cut -d' ' -f2-)"
  echo
  echo "## What changed and why"
  awk '/^## Scope/{p=1;next} /^## /{p=0} p&&NF' "$FILE"
  echo
  echo "## Definition of Done (evidence-backed)"
  if [[ -f "$SUMMARY" ]]; then
    jq -r '.items[] | "- [" + (if .status=="pass" then "x" else " " end) + "] " + .dod + " — `" + ((.evidence // "no evidence") | if type=="array" then join(", ") else . end) + "` (" + .status + ")"' "$SUMMARY"
    echo "- [$( [[ "$(jq -r .gate "$SUMMARY")" == "green" ]] && echo x || echo ' ')] tool/gate.sh at \`$(jq -r .sha "$SUMMARY")\` — \`evidence/$ID/gate.log\`"
  else
    echo "- [ ] evidence/$ID/summary.json missing — run the evidence-collector"
  fi
  echo
  echo "## Reviews"
  for f in evidence/"$ID"/review-*.json; do [[ -f "$f" ]] && echo "- $(basename "$f" .json): **$(jq -r .verdict "$f")** — $(jq -r .summary "$f")"; done
  [[ -f "evidence/$ID/fresh-eyes.md" ]] && { echo; echo "## Fresh eyes"; cat "evidence/$ID/fresh-eyes.md"; }
  echo
  echo "## Out of scope noticed"
  grep '^.*follow-up:' "$FILE" | sed 's/^.*follow-up:/- /' || echo "- none"
  echo
  echo "🤖 Generated with [Claude Code](https://claude.com/claude-code) via /build; agents: $(ls evidence/"$ID"/review-*.json 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/review-//;s/.json//' | paste -sd, -)"
} > "$BODY"
if [[ "$DRY" == "--dry-run" ]]; then mkdir -p "evidence/$ID"; cp "$BODY" "evidence/$ID/pr-body.md"; echo "pr: dry run · title: $TITLE · body: evidence/$ID/pr-body.md (nothing pushed)"; exit 0; fi
git push -u origin "$BR"
URL="$(gh pr create --title "$TITLE" --body-file "$BODY" --base main --head "$BR")"
echo "$URL"
bash "$(dirname "$0")/progress.sh" "$ID" pr "$URL" >/dev/null
git add "$FILE" && git commit -q -m "$ID: record PR link" && git push -q
echo "pr: opened $URL (a human merges)"
