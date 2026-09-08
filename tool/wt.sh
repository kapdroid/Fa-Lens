#!/usr/bin/env bash
# Worktree manager. One unit = one worktree = one branch = one PR.
#   tool/wt.sh add U-012 mssql-guard   → ../Fa-Lens.worktrees/U-012-mssql-guard on branch unit/U-012 (from freshest main)
#   tool/wt.sh path U-012              → prints the worktree path (exit 1 if none)
#   tool/wt.sh list                     → all unit worktrees with branch, dirty flag, merged flag, age
#   tool/wt.sh gc                       → removes worktrees whose branch is merged into main AND tree is clean
#   tool/wt.sh remove U-012 [--force]   → removes one (refuses if dirty unless --force)
set -euo pipefail

ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
WT_ROOT="$(dirname "$ROOT")/$(basename "$ROOT").worktrees"
MAIN_BRANCH="${FALENS_MAIN:-main}"

die() { echo "wt: $*" >&2; exit 1; }
need_id() { [[ "${1:-}" =~ ^[UE]-[0-9]{3}$ ]] || die "unit id must look like U-012 or E-001"; }

freshest_main() {
  if git -C "$ROOT" remote get-url origin >/dev/null 2>&1 && git -C "$ROOT" ls-remote --exit-code --heads origin "$MAIN_BRANCH" >/dev/null 2>&1; then
    git -C "$ROOT" fetch -q origin "$MAIN_BRANCH"
    echo "origin/$MAIN_BRANCH"
  else
    echo "$MAIN_BRANCH"   # remote empty (first days) → local main
  fi
}

cmd_add() {
  need_id "${1:-}"; local id="$1" slug="${2:-}"
  [[ -n "$slug" ]] || die "usage: wt.sh add <id> <slug>"
  [[ "$slug" =~ ^[a-z0-9-]+$ ]] || die "slug must be kebab-case"
  local dir="$WT_ROOT/$id-$slug" branch="unit/$id"
  [[ -e "$dir" ]] && die "worktree already exists: $dir"
  git -C "$ROOT" show-ref --verify --quiet "refs/heads/$branch" && die "branch $branch already exists (another session on this unit?)"
  mkdir -p "$WT_ROOT"
  local base; base="$(freshest_main)"
  git -C "$ROOT" worktree add -q -b "$branch" "$dir" "$base"
  # per-worktree env from template, never copied
  if [[ -f "$ROOT/.env.example" && ! -f "$dir/.env.local" ]]; then cp "$ROOT/.env.example" "$dir/.env.local"; fi
  # derive ports from unit number so parallel worktrees never collide
  local n="${id#*-}"; n=$((10#$n))
  printf 'FALENS_UNIT=%s\nAPI_PORT=%d\nWEB_PORT=%d\n' "$id" $((3000 + n)) $((5100 + n)) > "$dir/.env.unit"
  # shared evidence folder
  mkdir -p "$ROOT/evidence"; ln -sfn "$ROOT/evidence" "$dir/evidence"
  echo "$dir"
}

cmd_path() { need_id "${1:-}"; local d; d="$(ls -d "$WT_ROOT/$1-"* 2>/dev/null | head -1 || true)"; [[ -n "$d" ]] || die "no worktree for $1"; echo "$d"; }

cmd_list() {
  [[ -d "$WT_ROOT" ]] || { echo "(no worktrees)"; return; }
  printf '%-22s %-14s %-6s %-7s %s\n' UNIT BRANCH DIRTY MERGED AGE
  for d in "$WT_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    local name; name="$(basename "$d")"
    local br; br="$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
    local dirty="no"; [[ -n "$(git -C "$d" status --porcelain 2>/dev/null)" ]] && dirty="YES"
    local merged="no"; git -C "$ROOT" merge-base --is-ancestor "$br" "$MAIN_BRANCH" 2>/dev/null && merged="yes"
    local age; age="$(( ( $(date +%s) - $(stat -f %m "$d") ) / 86400 ))d"
    printf '%-22s %-14s %-6s %-7s %s\n' "$name" "$br" "$dirty" "$merged" "$age"
  done
}

cmd_remove() {
  need_id "${1:-}"; local d; d="$(cmd_path "$1")"; local force="${2:-}"
  if [[ -n "$(git -C "$d" status --porcelain)" && "$force" != "--force" ]]; then die "worktree is dirty: $d (use --force to discard)"; fi
  local br; br="$(git -C "$d" rev-parse --abbrev-ref HEAD)"
  git -C "$ROOT" worktree remove ${force:+--force} "$d"
  git -C "$ROOT" branch -D "$br" >/dev/null 2>&1 || true
  echo "removed $d ($br)"
}

cmd_gc() {
  [[ -d "$WT_ROOT" ]] || { echo "(nothing to gc)"; return; }
  local n=0
  for d in "$WT_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    local br; br="$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
    [[ -n "$br" ]] || continue
    if git -C "$ROOT" merge-base --is-ancestor "$br" "$MAIN_BRANCH" 2>/dev/null && [[ -z "$(git -C "$d" status --porcelain)" ]]; then
      git -C "$ROOT" worktree remove "$d" && git -C "$ROOT" branch -d "$br" >/dev/null 2>&1 || true
      echo "gc: removed $(basename "$d")"; n=$((n+1))
    fi
  done
  git -C "$ROOT" worktree prune
  echo "gc: $n removed"
}

case "${1:-}" in
  add) shift; cmd_add "$@";;
  path) shift; cmd_path "$@";;
  list) cmd_list;;
  remove) shift; cmd_remove "$@";;
  gc) cmd_gc;;
  *) sed -n '2,8p' "$0"; exit 1;;
esac
