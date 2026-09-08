#!/usr/bin/env bash
# One-time developer/agent setup. Idempotent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
chmod +x tool/*.sh tool/githooks/* tool/*.mjs 2>/dev/null || true
git config core.hooksPath tool/githooks
echo "hooks: core.hooksPath=tool/githooks"
for t in node git gh; do command -v "$t" >/dev/null || { echo "missing: $t" >&2; exit 1; }; done
node -e 'const v=process.versions.node.split(".")[0]; if (+v<22) { console.error("node >= 22 required, got", process.version); process.exit(1);} '
command -v pnpm >/dev/null || echo "note: pnpm not found (needed once packages/ exist)"
echo "setup: ok"
