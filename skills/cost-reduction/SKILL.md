---
name: cost-reduction
description: Define Cursor cost-reduction guardrails for RTK usage, context size, shell output, and validation scope without replacing task workflow.
---

# Cost Reduction

## Goal

Reduce Cursor spend by controlling token-heavy context, shell output, repeated exploration, avoidable retries, and validation cost.

This skill does not plan the task, compile handoffs, assign roles, define implementation steps, or replace the workflow plugin. It only defines cost controls that can be used beside any existing workflow.

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
2. `RTK requirements`
3. `Context limits`
4. `Shell-output limits`
5. `Dry-run requirements`
6. `Validation budget`
7. `Stop and ask when`

Keep the output short and operational. Each item must be a constraint or cost-saving measure, not an implementation step.

## Boundaries

- Do not create execution packets.
- Do not define task order or implementation ownership.
- Do not invent workflow stages.
- Do not emit handoff content.
- If task planning is needed, tell the user to use the workflow plugin or Cursor's normal planning mode.
