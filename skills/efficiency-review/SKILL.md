---
name: efficiency-review
description: Review completed Cursor work for RTK, context, and validation waste.
---

# Efficiency Review

## Goal

Identify whether completed work spent unnecessary model context or shell output, missed RTK usage, skipped low-cost validation, or missed cost-reduction measures.

This review is not a delivery review and not a workflow review. It does not judge whether the task outcome is correct except where validation spending creates cost risk.

## Inputs

- original request
- cost budget, if any
- changed files or artifacts
- shell commands and relevant output
- validation evidence
- known deviations and skipped checks

## Readonly Delegation

Review inline by default. Delegate to the `efficiency-reviewer` agent only when at least one threshold is met:

- six or more changed files
- ten or more relevant shell commands
- global configuration or publishing changes
- contradictory or materially incomplete evidence

If delegation is required but unavailable, state that limitation and perform a concise readonly review in chat.

## Cost Snapshot

When RTK is available, run `rtk gain --project --format json` and report `summary.total_commands`, `total_input`, `total_output`, `total_saved`, and `avg_savings_pct`. Calculate a task delta only when the cost budget contains a baseline captured in the same task. Otherwise label the values as cumulative project history.

Do not use `rtk discover` or `rtk session` as Cursor metrics. Do not calculate monetary cost unless the user provides model-specific input and output token prices.

## Output

Use this structure:

- **Verdict**: `efficient` | `mostly efficient` | `wasteful` | `insufficient evidence`
- **RTK usage**: evidence-backed bullets
- **Context discipline**: targeted reads, broad scans, repeated reads, or missing context
- **Validation economy**: checks run, cheap checks skipped, or over-testing
- **Risks from under-spending**: correctness risks caused by too little context or validation
- **Cost snapshot**: cumulative project values, same-task delta, or `unavailable`
- **Cost adjustments**: `none` or concrete measures for the next Cursor session

Prefer specific command, file, and verification evidence over general advice.
