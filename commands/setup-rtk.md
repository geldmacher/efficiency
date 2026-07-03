---
name: setup-rtk
description: Verify RTK and configure Cursor to use RTK-backed shell execution with explicit confirmation.
---

# Setup RTK

Use when a user wants Cursor to use RTK for cheaper shell context.

1. Follow the `rtk-cursor-setup` skill.
2. Check whether RTK is available with `rtk --version` and `command -v rtk`.
3. If RTK is missing, show the official RTK installation documentation and stop before changing anything.
4. Run `rtk init --global --agent cursor --dry-run`.
5. Summarize exactly what the dry-run would change.
6. Ask the user for explicit confirmation before running `rtk init --global --agent cursor`.
7. After applying setup, instruct the user to restart Cursor and verify the integration.

Do not install RTK, edit global Cursor configuration, or run non-dry-run setup without confirmation.
