#!/usr/bin/env bash
# SessionStart hook: give the session its bearings in ~10 lines instead of a re-exploration.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" 2>/dev/null || exit 0
BR="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "FA Lens · branch $BR · $(git log -1 --format='%h %s' 2>/dev/null | cut -c1-72)"
if [[ -f .falens-unit ]]; then
  U="$(cat .falens-unit)"; F="$(ls docs/plan/units/$U*.md 2>/dev/null | head -1)"
  echo "active unit: $U ($F)"
  [[ -n "$F" ]] && { echo "last progress:"; awk '/^## Progress/{p=1;next} p&&NF' "$F" | tail -2 | sed 's/^/  /'; }
else
  echo "no active unit in this checkout. Ready units:"
  for f in docs/plan/units/[UE]-*.md; do grep -q '^status: ready' "$f" && echo "  $(grep -m1 '^id:' "$f" | cut -d' ' -f2) · $(grep -m1 '^title:' "$f" | cut -d' ' -f2-)"; done 2>/dev/null | head -8
fi
WT="$(bash tool/wt.sh list 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')"; echo "worktrees: $WT (tool/wt.sh list)"
exit 0
