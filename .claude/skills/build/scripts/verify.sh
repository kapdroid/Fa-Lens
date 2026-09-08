#!/usr/bin/env bash
# Verify step: full gate into evidence/<id>/gate.log, then list the DoD for the evidence-collector.
set -uo pipefail
ID="${1:?unit id}"
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
mkdir -p "evidence/$ID"
{ echo "# $(date '+%Y-%m-%d %H:%M') · $(git rev-parse --short HEAD) · $(git rev-parse --abbrev-ref HEAD)"; bash tool/gate.sh; } 2>&1 | tee "evidence/$ID/gate.log"
GATE=${PIPESTATUS[0]}
echo
echo "DoD items to evidence (from the unit file):"
node -e '
const {readdirSync}=require("fs");const {join}=require("path");
import(join(process.cwd(),"tool/lib/frontmatter.mjs")).then(({readFrontmatter})=>{
 const dir=join(process.cwd(),"docs/plan/units");const f=readdirSync(dir).find(x=>x.startsWith(process.argv[1]));
 const {data}=readFrontmatter(join(dir,f));(data.dod||[]).forEach((d,i)=>console.log(`  ${i+1}. ${d}`));
 console.log("expected evidence files:",(data.evidence||[]).join(", ")||"(none listed)");});' "$ID"
[[ $GATE -eq 0 ]] && echo "verify: gate GREEN, log at evidence/$ID/gate.log" || { echo "verify: gate RED, see evidence/$ID/gate.log"; exit 1; }
