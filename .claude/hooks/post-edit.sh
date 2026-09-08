#!/usr/bin/env bash
# PostToolUse hook for Edit|Write. Fast, file-scoped checks. Exit 2 = feed the problem back to Claude.
# Input: hook JSON on stdin (tool_input.file_path).
set -uo pipefail
FILE="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[[ -n "$FILE" && -f "$FILE" ]] || exit 0
ROOT="${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null || pwd)}"
case "$FILE" in
  *.sh)   bash -n "$FILE" || { echo "post-edit: bash syntax error in $FILE" >&2; exit 2; } ;;
  *.mjs|*.js) node --check "$FILE" 2>/dev/null || { echo "post-edit: JS syntax error in $FILE" >&2; exit 2; } ;;
  *.json) jq empty "$FILE" 2>/dev/null || { echo "post-edit: invalid JSON in $FILE" >&2; exit 2; } ;;
  */docs/plan/units/*.md) (cd "$ROOT" && node tool/check-units.mjs) >/dev/null 2>&1 || { (cd "$ROOT" && node tool/check-units.mjs) >&2; exit 2; } ;;
  */docs/adr/*.md|*/AGENTS.md|*/CLAUDE.md) (cd "$ROOT" && node tool/check-docs.mjs) >/dev/null 2>&1 || { (cd "$ROOT" && node tool/check-docs.mjs) >&2; exit 2; } ;;
esac
# Guard: edits must stay inside the current unit's allowed_files when a unit is active in this worktree.
UNIT_FILE="$(ls "$ROOT"/.falens-unit 2>/dev/null || true)"
if [[ -n "$UNIT_FILE" ]]; then
  UNIT_ID="$(cat "$UNIT_FILE")"
  REL="${FILE#"$ROOT"/}"
  if ! (cd "$ROOT" && node tool/check-allowed.mjs "$UNIT_ID" "$REL"); then
    echo "post-edit: $REL is outside allowed_files of $UNIT_ID. Revert it or write the need into the unit's Progress and stop." >&2; exit 2
  fi
fi
exit 0
