# Intake must accept a `depends_on` unit that is merged but still says `status: review`

A unit's `status` field only reaches `done` through a human or loop step acting on it; a PR merge alone does not flip it. E-005 depends on E-002, whose file still read `status: review` even though `unit/E-002` was already merged into `origin/main`. Intake originally required a dependency's status to be `done` before allowing a new unit to start, so it refused to proceed on a real, already-integrated dependency.

Fixed in PR #6: intake now also accepts a dependency in `status: review` if its `unit/<id>` branch is merged into `origin/main` (checked with `git merge-base --is-ancestor` or equivalent), not just `status: done`. The underlying gap — nothing in the loop sets a unit's status to `done` after its PR merges — is still open; see the follow-up in `docs/plan/units/U-001-gate-runs-tool-tests.md`'s theme and E-005's own Progress. Until a step closes that gap, expect more units to be merged while still reading `review`, and intake needs to keep tolerating that rather than a human patching each unit file by hand.

Second, unrelated defect fixed in the same PR: `.falens-unit` was tracked on `main` again despite the `.gitignore` entry added for the E-001 fix (see `docs/knowledge/harness/build-skill-isolate-before-plan.md`) — a gitignore entry does not retroactively untrack a file that was already committed before the entry existed. PR #6 removed it from the index and applied `git update-index --skip-worktree` in this worktree so the harness marker stays out of future diffs.

Source: E-005 intake (harness defects fixed in PR #6, https://github.com/kapdroid/Fa-Lens/pull/6), 2026-09-09
