#!/usr/bin/env bash
# PreToolUse hook for Bash. Deterministic terminus rule and destructive-command guard.
# Denies (exit 2 + JSON) rather than trusting instructions.
set -uo pipefail
CMD="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[[ -n "$CMD" ]] || exit 0
deny() { jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'; exit 0; }

# never push main, never force-push, never delete remote branches
if echo "$CMD" | grep -Eq 'git push[^|;&]*( origin)? +(main|master)( |$)'; then deny "Pushing main is not allowed. Open a PR from a unit/ branch."; fi
if echo "$CMD" | grep -Eq 'git push[^|;&]*(--force|-f |--delete)'; then deny "Force-push and remote branch deletion are not allowed."; fi
# never commit on main in the root checkout (units live in worktrees)
if echo "$CMD" | grep -Eq '(^|[;&|] *)git commit'; then
  BR="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [[ "$BR" == "main" && -z "${FALENS_ALLOW_MAIN_COMMIT:-}" ]]; then deny "Commits on main are not allowed. Work in a unit worktree (tool/wt.sh add U-xxx <slug>). Set FALENS_ALLOW_MAIN_COMMIT=1 only for bootstrap/docs housekeeping by a human."; fi
fi
# destructive shell
if echo "$CMD" | grep -Eq '(^|[;&| ])rm -rf +(/|~|\$HOME|\.)( |$)'; then deny "Refusing rm -rf on root/home/cwd."; fi
if echo "$CMD" | grep -Eq 'git (reset --hard|clean -fd|checkout -- \.)'; then deny "Destructive git reset/clean needs a human; explain what you want to discard."; fi
# never write to a source database from a shell
if echo "$CMD" | grep -Eiq '(sqlcmd|psql|clickhouse-client)[^|;&]*(insert|update|delete|drop|alter|truncate|merge) '; then deny "Writes to source databases are forbidden (ADR-0005)."; fi
exit 0
