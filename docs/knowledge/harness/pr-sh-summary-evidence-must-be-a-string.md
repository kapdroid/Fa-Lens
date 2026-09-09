# `tool/pr.sh`'s body renderer needs `summary.json` `evidence` fields to be plain strings

Rule: when writing `evidence/<unit>/summary.json`, each item's `evidence` value must be a single string (e.g. a comma-joined list of paths as one string), not a JSON array. `pr.sh` builds the PR body with a `jq` filter that string-concatenates the field directly; handed an array it errors out and the PR step fails.
Why: this is a harness defect, not a convention to design around forever — `pr.sh`'s jq should accept an array too — but until it's fixed, an item with multiple evidence files needs to name them in one string.

Follow-up: fix `tool/pr.sh`'s jq body renderer to accept an array `evidence` field (join with `, `) so unit authors don't have to remember this.

Source: U-006, 2026-09-09.
