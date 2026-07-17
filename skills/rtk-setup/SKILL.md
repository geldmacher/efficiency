---
name: rtk-setup
description: Inspect and prepare optional RTK integration for Cursor.
---

# RTK Setup

Use RTK's installed command surface as the source of truth. Start with read-only identification: locate `rtk`, inspect `rtk --version`, and run `rtk gain`. A successful gain summary distinguishes Rust Token Killer from unrelated binaries with the same name. If RTK is absent or identification fails, report that clearly and provide installation guidance only when the user asks for it.

Inspect the current Cursor integration with `rtk init --show --agent cursor`. Before a global change, run `rtk init --global --agent cursor --dry-run` and summarize the affected files or settings. Apply the non-dry-run command only when the user requested the change and any approval required by Cursor was granted.

After a change, repeat the integration inspection and use `rtk hook check --agent cursor '<finite-command>'` before a finite, non-destructive smoke check. Do not use watchers, servers, interactive commands, streaming output, or destructive commands as verification fixtures. If the current environment cannot run a check, give the relevant next command and mark the result as unverified.

For removal, preview `rtk init --global --agent cursor --uninstall --dry-run` first and apply it only on explicit request. Prefer RTK's native Cursor integration over a custom hook, never edit global Cursor configuration speculatively, and report exactly what was verified or remains open.
