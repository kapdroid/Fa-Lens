# Evidencing a DoD command that mutates a committed ledger: run it literally, capture the diff, then revert

Some DoD items are phrased as a literal command a human could type, e.g. `node tool/evals.mjs record E-001 pass 'gate green, note present' appends a JSON line to docs/orchestration/evals.jsonl`. Running that command for real against the committed `docs/orchestration/evals.jsonl` leaves a fabricated row in the ledger — a `record` call made only to produce evidence, not a real eval run.

The pattern that keeps the evidence honest and the ledger honest at the same time: run the DoD command exactly as written, save the appended line and `git diff` to `evidence/<unit>/record.log`, then `git checkout -- docs/orchestration/evals.jsonl` to drop the fabricated row, and say so explicitly in the evidence log (e.g. "the DoD-1 line then reverted"). The committed ledger ends up holding only real eval runs; the evidence file proves the command works without that proof polluting the data it operates on.

This generalizes to any DoD that reads "running command X appends/writes to committed file Y": evidence the mutation, then decide on purpose whether the mutation should survive in the commit or be reverted, and record that decision in the evidence log rather than leaving it implicit.

Source: E-005, 2026-09-09
