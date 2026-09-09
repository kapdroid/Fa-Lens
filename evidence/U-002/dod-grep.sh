#!/usr/bin/env bash
# DoD-1: count how many of the nine screens.md empty-state sentences appear verbatim in the prototype.
F="${1:-docs/design/prototype/index.html}"; n=0
while IFS= read -r s; do grep -qF "$s" "$F" && n=$((n+1)); done <<'S'
No runs yet for Van Sales in Mars · 234474. Run the smoke flow to get a first verdict.
No endpoints in the catalog for this module yet. Import a Postman collection or an OpenAPI spec to fill it.
No cases yet. Generate from the catalog or save one from the workbench.
No flows in Van Sales. Start from the app's real sequence.
No validation has run for this scope yet. Choose a validation and a date range to run one.
No load tests yet. Export a k6 script from any flow or endpoint to start one.
Nothing has run in this scope yet. Results appear here the moment a run finishes.
No test users or fixtures for this tenant yet. Add a test user to run write flows on the sandbox company.
No notes for this module yet. Sync the ADO knowledge base or write the first gotcha.
S
echo "$n"
