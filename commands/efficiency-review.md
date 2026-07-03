---
name: efficiency-review
description: Review completed work for RTK usage, context waste, skipped validation, and cheaper next steps.
---

# Efficiency Review

Use after implementation when the user wants to know whether the work was done efficiently.

1. Follow the `efficiency-review` skill.
2. Delegate the review to the readonly `efficiency-reviewer` agent when available.
3. Provide the original request, execution packet or plan, actual changes, commands run, verification evidence, and known deviations.
4. Start with concrete waste, risk, or missed RTK opportunities.
5. If follow-up work is useful, emit a compact next execution packet that can be run with `/efficiency-plan` or directly executed.

Do not make efficiency review mandatory by default.
