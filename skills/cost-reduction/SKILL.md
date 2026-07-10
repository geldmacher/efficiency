---
name: cost-reduction
description: Set Cursor cost guardrails for RTK, context, shell output, and validation.
---

# Cost Reduction

## Goal

Reduce Cursor spend by controlling token-heavy context, shell output, repeated exploration, avoidable retries, and validation cost.

This skill does not plan the task, compile handoffs, assign roles or define implementation steps. It only defines cost controls that can be used beside any existing workflow.

Use automatically only when at least one threshold is met: five expected shell commands, three expected changed files, or global configuration, migration, generation, or publishing work. Explicit user invocation always applies.

## Cost Drivers

Check for:

- missing RTK integration or commands that bypass RTK
- broad repository scans before targeted search
- large file dumps where narrow ranges would work
- repeated reads of unchanged files
- command output kept beyond the evidence needed
- non-dry-run setup, publishing, generation, or migrations
- guessing that is likely to cause rework
- skipped cheap validation that would prevent expensive follow-up
- excessive validation disproportionate to the change risk

## Cost Budget Output

Use this structure:

1. `Cost objective`
2. `Cost snapshot`
3. `RTK requirements`
4. `Context limits`
5. `Shell-output limits`
6. `Dry-run requirements`
7. `Validation budget`
8. `Stop and ask when`

Keep the output short and operational. Each item must be a constraint or cost-saving measure, not an implementation step.

When RTK is available, create the snapshot with `rtk gain --project --format json` and report its `summary.total_commands`, `total_input`, `total_output`, `total_saved`, and `avg_savings_pct` fields. Otherwise use `unavailable` with a reason. Treat the snapshot as cumulative project history, not a task delta.

## Boundaries

- Do not create execution packets.
- Do not define task order or implementation ownership.
- Do not invent workflow stages.
- Do not emit handoff content.
- Do not use `rtk discover` or `rtk session` as Cursor metrics because they inspect Claude Code history.
- Do not calculate monetary cost unless the user provides model-specific input and output token prices.
