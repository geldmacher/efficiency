---
name: setup-rtk
description: Verify RTK and configure Cursor to use RTK-backed shell execution with explicit confirmation.
---

# Setup RTK

Use when a user wants Cursor to use RTK for cheaper shell context.

1. Follow the `rtk-cursor-setup` skill.
2. Locate RTK with `command -v rtk`, then run `rtk --version` and `rtk gain`. If `rtk gain` is not recognized, stop because the installed binary is not Rust Token Killer.
3. Run `rtk init --show` to detect the current Cursor hook state.
4. On native Windows, explain that transparent Cursor rewriting requires WSL and stop before promising full hook support.
5. Preview setup with `rtk init --global --agent cursor --dry-run -v` and summarize exactly what would change.
6. Ask for explicit confirmation before running `rtk init --global --agent cursor`.
7. After applying setup, instruct the user to restart Cursor, rerun `rtk init --show`, and smoke-test one finite safe shell command.

Do not install RTK, edit global Cursor configuration, or run non-dry-run setup without confirmation.
