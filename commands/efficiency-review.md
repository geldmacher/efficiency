---
name: efficiency-review
description: Review completed work for RTK usage, context waste, validation cost, and missed cost-reduction measures.
---

# Efficiency Review

Use after implementation when the user wants to know whether the work avoided unnecessary Cursor cost.

1. Follow the `efficiency-review` skill.
2. Review inline by default. Delegate to `efficiency-reviewer` only when at least one threshold is met: six changed files, ten relevant shell commands, global configuration or publishing changes, or contradictory or materially incomplete evidence.
3. Provide the original request, cost budget and baseline snapshot if any, actual changes, commands run, verification evidence, and known deviations.
4. Capture the current snapshot with `rtk gain --project --format json` when available. Calculate a task delta only when a baseline from the same task exists.
5. Start with concrete waste, risk, or missed RTK opportunities.
6. Recommend cost-reduction adjustments only.

Do not make efficiency review mandatory by default.

Do not use `rtk discover` or `rtk session` as Cursor metrics. Do not calculate money unless the user provides model-specific input and output token prices.
