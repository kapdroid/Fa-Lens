#!/usr/bin/env bash
# The gate. Same command locally, in git hooks, and in CI. Exit 0 = green.
#   tool/gate.sh          full gate
#   tool/gate.sh --fast   pre-commit subset (no containers, no e2e)
# Stages are added as packages appear; each stage is skipped with a note when its inputs do not exist yet,
# and NEVER silently. Docs and unit checks always run.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
FAST=0; [[ "${1:-}" == "--fast" ]] && FAST=1
fail=0; stages=0
run() { local name="$1"; shift; stages=$((stages+1)); printf '▸ %-28s' "$name"; local out; if out="$("$@" 2>&1)"; then echo "ok"; else echo "FAIL"; echo "$out" | sed 's/^/    /'; fail=1; fi; }
skip() { printf '▸ %-28s%s\n' "$1" "skipped ($2)"; }

run "docs"            node tool/check-docs.mjs
run "units"           node tool/check-units.mjs
run "harness"         node tool/check-harness.mjs
run "catalog"         node tool/check-catalog.mjs
run "whitespace"      git diff --cached --check
run "no-secrets"      bash -c '! git grep -nE "(password|secret|connection ?string)\s*[:=]\s*[\"'"'"'][^\"'"'"'\$ ]{6,}" -- ":!*.md" ":!tool/gate.sh" ":!docs/**" 2>/dev/null'
run "prototype-parses" node -e "const fs=require('fs');const s=fs.readFileSync('docs/design/prototype/index.html','utf8');const js=s.slice(s.indexOf('<script>')+8,s.lastIndexOf('</script>'));new Function(js);"
run "tokens-in-sync"  bash -c 'test ! -f packages/ui/tokens.css || diff -q docs/design/tokens.css packages/ui/tokens.css'
run "shell-scripts"   bash -c 'for f in tool/*.sh tool/githooks/*; do bash -n "$f" || exit 1; done'

if [[ -f package.json ]]; then
  run "typecheck"  pnpm -s typecheck
  run "lint"       pnpm -s lint
  run "boundaries" node tool/check-boundaries.mjs
  run "contract"   pnpm -s contract:check
  if [[ $FAST -eq 0 ]]; then
    run "unit-tests"        pnpm -s test
    run "integration-tests" pnpm -s test:integration
    run "e2e"               pnpm -s test:e2e
  else
    skip "unit-tests" "--fast"; skip "integration-tests" "--fast"; skip "e2e" "--fast"
  fi
else
  skip "typecheck/lint/tests" "no package.json yet"
fi

if [[ $fail -eq 0 ]]; then echo "gate: GREEN ($stages stages)"; else echo "gate: RED"; exit 1; fi
