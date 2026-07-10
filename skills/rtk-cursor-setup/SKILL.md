---
name: rtk-cursor-setup
description: Verify RTK and safely configure its supported Cursor hook with approval.
---

# RTK Cursor Setup

## Goal

Enable Cursor to benefit from RTK's supported agent integration while avoiding surprise global changes.

## Required Safety

- Never install RTK without a direct user request.
- Never run non-dry-run RTK setup without explicit user confirmation.
- Never ship or synthesize a custom Cursor hook.
- Delegate transparent Cursor integration to `rtk init --global --agent cursor`.

## Workflow

1. Check RTK availability:
   - `command -v rtk`
   - `rtk --version`
   - `rtk gain`
2. If RTK is missing:
   - Link to `https://www.rtk-ai.app/docs/getting-started/installation/`.
   - Tell the user setup cannot continue until RTK is installed.
   - Stop.
3. If `rtk gain` is not recognized, stop and explain that another binary named `rtk` is installed.
4. Inspect current hook state with `rtk init --show`.
5. If the host is native Windows, explain that transparent Cursor rewriting requires WSL; do not report full hook support.
6. Preview Cursor integration:
   - Run `rtk init --global --agent cursor --dry-run -v`.
   - Summarize the files or settings that would change.
7. Ask for explicit confirmation before applying:
   - Run `rtk init --global --agent cursor` only after confirmation.
8. Post-setup:
   - Tell the user to restart Cursor.
   - Rerun `rtk init --show` and require the Cursor hook to be registered.
   - Verify with one finite safe shell command and report `rtk gain` when savings evidence is useful.

## Failure Handling

- If the dry-run fails, report the exact command and error summary.
- If global config writes are blocked, tell the user which permission or manual step is required.
- If RTK reports unsupported Cursor state, stop and link to RTK supported-agent documentation.
- When rollback is requested, preview `rtk init --global --agent cursor --uninstall --dry-run -v` before asking for confirmation to uninstall.
