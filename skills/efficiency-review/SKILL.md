---
name: efficiency-review
description: Review completed Cursor work for concrete cost, context, RTK, and validation inefficiencies without creating workflow follow-up.
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

Delegate to the `efficiency-reviewer` agent when available. If delegation is unavailable, state that limitation and perform a concise readonly review in chat.

## Output

Use this structure:

- **Verdict**: `efficient` | `mostly efficient` | `wasteful` | `insufficient evidence`
- **RTK usage**: evidence-backed bullets
- **Context discipline**: targeted reads, broad scans, repeated reads, or missing context
- **Validation economy**: checks run, cheap checks skipped, or over-testing
- **Risks from under-spending**: correctness risks caused by too little context or validation
- **Cost adjustments**: `none` or concrete measures for the next Cursor session

Prefer specific command, file, and verification evidence over general advice.
