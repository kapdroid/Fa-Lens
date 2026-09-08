#!/usr/bin/env bash
# Append a progress line to the unit file in the CURRENT checkout (worktree or root).
#   progress.sh U-012 build "gate --fast green at abc123"
set -euo pipefail
ID="${1:?unit id}"; STATE="${2:?state}"; MSG="${3:?message}"
ROOT="$(git rev-parse --show-toplevel)"
FILE="$(ls "$ROOT"/docs/plan/units/"$ID"*.md | head -1)"
[[ -f "$FILE" ]] || { echo "progress: no unit file for $ID" >&2; exit 1; }
grep -q '^## Progress' "$FILE" || printf '\n## Progress\n' >> "$FILE"
printf '%s · %s · %s\n' "$(date '+%Y-%m-%d %H:%M')" "$STATE" "$MSG" >> "$FILE"
# keep status in sync with the loop
case "$STATE" in
  isolate|build|verify|review) sed -i '' 's/^status: .*/status: in_progress/' "$FILE" ;;
  pr) sed -i '' 's/^status: .*/status: review/' "$FILE" ;;
esac
tail -1 "$FILE"
