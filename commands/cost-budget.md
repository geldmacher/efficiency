---
name: cost-budget
description: Define cost-reduction guardrails for a Cursor session without creating a task workflow or handoff.
---

# Cost Budget

Use when a Cursor session should reduce token and command-output cost before or during work.

1. Follow the `cost-reduction` skill.
2. Always run when the user explicitly invokes this command. For automatic use, require at least one threshold: five expected shell commands, three expected changed files, or global configuration, migration, generation, or publishing work.
3. Identify the cost drivers: broad context, noisy shell output, missing RTK, repeated reads, risky guessing, or excessive validation.
4. When RTK is available, capture a baseline with `rtk gain --project --format json`. Report `total_commands`, `total_input`, `total_output`, `total_saved`, and `avg_savings_pct`, or state that the snapshot is unavailable.
5. Set explicit guardrails for context reads, shell commands, dry-runs, validation, and stop conditions.
6. Keep the output limited to cost controls and the optional baseline snapshot.
7. If the user needs task planning or handoff structure, defer that to the workflow plugin or Cursor's normal planning surface.

The result should be a compact cost budget that can sit alongside any workflow without replacing it.

Do not use `rtk discover` or `rtk session` as Cursor metrics. Do not calculate money unless the user provides model-specific input and output token prices.
