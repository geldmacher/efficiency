---
name: cost-budget
description: Define cost-reduction guardrails for a Cursor session without creating a task workflow or handoff.
---

# Cost Budget

Use when a Cursor session should reduce token and command-output cost before or during work.

1. Follow the `cost-reduction` skill.
2. Identify the cost drivers for the current work: broad context, noisy shell output, missing RTK, repeated reads, risky guessing, or excessive validation.
3. Set explicit guardrails for context reads, shell commands, dry-runs, validation, and stop conditions.
4. Keep the output limited to cost controls. Do not define implementation steps, ownership roles, handoff packets, or delivery workflow.
5. If the user needs task planning or handoff structure, defer that to the workflow plugin or Cursor's normal planning surface.

The result should be a compact cost budget that can sit alongside any workflow without replacing it.
