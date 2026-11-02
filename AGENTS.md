# Efficiency repository instructions

OpenCode config (opencode.json, commands/) is shared with Workflow and Design: merge only, touch only your own entries, never write backups; uninstall removes only your own entries; rollback means installing an older GitHub release.

Apply that rule to `~/.config/opencode/opencode.json` and to every file under `~/.config/opencode/commands/`. Local deploy keeps the original bytes of those shared files in memory only. If a write in the same run fails, it rewrites them from that memory and does not copy them to disk. A failure after a plugin directory is replaced stops and reports; the previous directory is not retained. Uninstall removes only Efficiency's skills entry, its own command files, and its package. A second deploy or uninstall that changes nothing does not write. Leave Workflow and Design entries, unrelated commands, and `opencode.jsonc` in place.

Deploy and release work for this repository follows `.agents/skills/deploy-local-plugin/SKILL.md`, `.agents/skills/release-plugin/SKILL.md`, and `docs/installation.md`.
