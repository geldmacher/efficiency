---
name: rtk-setup
description: Inspect and prepare optional RTK integration for Cursor, Codex, or another documented agent client.
---

# RTK Setup

Before writing a user-facing result, read [the human communication contract](../efficiency/references/human-communication.md). State the current RTK state, what is verified or still open, and the next safe action when useful. Summarize command evidence instead of returning an unexplained command wall.

Use RTK's installed command surface as the source of truth. Start with read-only identification: locate `rtk`, inspect `rtk --version`, and run `rtk gain`. A successful gain summary distinguishes Rust Token Killer from unrelated binaries with the same name. If RTK is absent or identification fails, report that clearly and provide installation guidance only when the user asks for it.

Identify whether the active host is Cursor, Codex, or another Agent Plugins client before inspecting its integration.

For Cursor, inspect with `rtk init --show --agent cursor`. Before a global change, run `rtk init --global --agent cursor --dry-run` and summarize the affected files or settings. Apply the non-dry-run command only when the user requested the change and any approval required by Cursor was granted.

After a change, repeat the integration inspection and use `rtk hook check --agent cursor '<finite-command>'` before a finite, non-destructive smoke check. For RTK 0.44.0 or newer, also exercise the installed Cursor processor with a minimal `preToolUse` JSON fixture, for example `printf '%s' '{"tool_input":{"command":"git status --short"}}' | rtk hook cursor`. A supported rewrite must retain the RTK command in `updated_input`: `permission: allow` may run immediately, while `permission: ask` is a working native approval path and must not run before the user approves it. An empty response, a missing rewrite for a command that `rtk hook check` supports, or execution of the raw command remains a failed or unverified integration.

Run the real smoke check through Cursor and use `rtk gain --history` to confirm that RTK executed the rewritten command. If Cursor requests approval, keep that approval in Cursor's native flow; headless non-execution of an `ask` result is expected until approval is available.

For Codex, use the locally verified RTK 0.44.2 command surface. Inspect with `rtk init --codex --show`. Before a global change, run `rtk init --global --codex --dry-run` and summarize the affected `AGENTS.md` and `RTK.md` files. Apply the non-dry-run command only when the user explicitly requested the change and Codex granted any required filesystem approval. Verify the active instruction reference, run one approved finite command directly as `rtk <command>`, and inspect `rtk gain --history`. Do not expect or claim Cursor-style `updated_input`, `permission`, or hook-processor evidence in Codex.

For another Agent Plugins client, keep host integration read-only and generic. Use `rtk --version` and `rtk gain`, then inspect only integration commands or configuration surfaces documented by that host and the installed RTK version. If no documented integration exists, report it as unavailable or unverified; do not run Cursor or Codex setup commands and do not edit host configuration.

For every host, do not use watchers, servers, interactive commands, streaming output, or destructive commands as verification fixtures. If the current environment cannot run a check, give the relevant next command and mark the result as unverified.

For Cursor removal, preview `rtk init --global --agent cursor --uninstall --dry-run`. For Codex removal, preview `rtk init --global --codex --uninstall --dry-run`. Apply either removal only on explicit request. Prefer RTK's native host integration over custom machinery, never edit global configuration speculatively, and report exactly what was verified or remains open.
