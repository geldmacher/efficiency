# Efficiency repository instructions

OpenCode config (opencode.json, commands/) is shared with Workflow and Design: merge only, always write a persistent backup before changing anything, touch only your own entries, rollback/uninstall removes only your own entries.

Apply that rule to `~/.config/opencode/opencode.json` and to every file under `~/.config/opencode/commands/`. Local deploy writes a timestamped backup under `~/.config/opencode/.local-deploy-backups/geldmacher-efficiency/` before it changes the shared file or one of Efficiency's command files, and leaves that backup after success or failure. A failed deploy restores those files from the backup. Uninstall removes only Efficiency's skills entry, its own command files, and its package. A second deploy or uninstall that changes nothing does not write. Leave Workflow and Design entries, unrelated commands, and `opencode.jsonc` in place.

Deploy and release work for this repository follows `.agents/skills/deploy-local-plugin/SKILL.md`, `.agents/skills/release-plugin/SKILL.md`, and `docs/installation.md`.
