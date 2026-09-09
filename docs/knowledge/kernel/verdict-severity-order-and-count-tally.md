# Verdict severity order is `none < skipped < ok < warn < error < fail`, and counts tally direct children only

Rule: the worst-of rollup (step → flow → testing type → module → company) orders severities `none < skipped < ok < warn < error < fail`. `fail` outranks `error` even though "error" sounds worse in everyday language: a `fail` is a confirmed product defect (an assertion the kernel evaluated and found false), while an `error` is an unknown — the executor threw, a source was unreachable, or something else prevented the kernel from even reaching a judgement. A confirmed defect must always win a worst-of comparison against "we don't know," so `fail` sorts last (worst). Do not swap this order to match intuition about which word "sounds worse."

Also: `rollup()`'s per-severity counts tally direct children at each level, not leaves. A company's count of "1 failing" means one of its modules is failing, not one leaf assertion somewhere under it — flattening to leaf counts changes the number the company matrix and module tabs display. This reading is easy to get backwards when writing rollup fixtures; write a comment naming the semantic next to any count assertion in a rollup test.

Source: U-008, 2026-09-09.
