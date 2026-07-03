---
name: rtk-cursor-setup
description: Verify RTK and safely configure Cursor's supported RTK integration without mutating global config before confirmation.
---

# RTK Cursor Setup

## Goal

Enable Cursor to benefit from RTK's supported agent integration while avoiding surprise global changes.

## Required Safety

- Never install RTK without a direct user request.
- Never run non-dry-run RTK setup without explicit user confirmation.
- Never ship or synthesize a custom Cursor hook for v0.1.
- Delegate transparent Cursor integration to `rtk init --global --agent cursor`.

## Workflow

1. Check RTK availability:
   - `rtk --version`
   - `command -v rtk`
2. If RTK is missing:
   - Link to `https://www.rtk-ai.app/docs/getting-started/installation/`.
   - Tell the user setup cannot continue until RTK is installed.
   - Stop.
3. Preview Cursor integration:
   - Run `rtk init --global --agent cursor --dry-run`.
   - Summarize the files or settings that would change.
4. Ask for explicit confirmation before applying:
   - Run `rtk init --global --agent cursor` only after confirmation.
5. Post-setup:
   - Tell the user to restart Cursor.
   - Verify with a small shell command and, when useful, `rtk gain`.

## Failure Handling

- If the dry-run fails, report the exact command and error summary.
- If global config writes are blocked, tell the user which permission or manual step is required.
- If RTK reports unsupported Cursor state, stop and link to RTK supported-agent documentation.
