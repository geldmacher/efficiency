---
name: deploy-local-plugin
description: Build all plugin targets, then inspect, dry-run, or deploy only the current repository's host-specific local copies for Cursor, Codex, and OpenCode. Use only when the user explicitly invokes $deploy-local-plugin in a plugin development repository.
---

# Deploy Local Plugin

Operate only on the current repository. Never search for or deploy sibling plugins, and never invent an `--all` mode.

1. Confirm the current repository contains `package.json`, root `plugin.json`, `.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json`, `targets/opencode/.opencode-plugin/plugin.json`, and `scripts/local-plugin-deploy.mjs`.
2. Treat an invocation without a requested action as a standard deployment. Map the user's request exactly:
   - status or inspect: `npm run deploy:status`
   - dry run or preview: `npm run deploy:local -- --dry-run`
   - deploy or update: `npm run deploy:local`
   - full deploy or full validation: `npm run deploy:local -- --full`
   - OpenCode uninstall: `npm run deploy:uninstall`
   Resolve host scope independently: no host request means Cursor, Codex, and OpenCode; append `--cursor-only`, `--codex-only`, or `--opencode-only` for one host. The host flags work with status, dry-run, standard, and full paths. Uninstall accepts `--opencode-only` and rejects `--cursor-only` and `--codex-only`.
3. Run from the repository root. Do not manually copy plugin files, edit the personal Marketplace, remove Codex caches, trust hooks, restart Cursor, restart Codex, or restart OpenCode.
4. OpenCode config (opencode.json, commands/) is shared with Workflow and Design: merge only, always write a persistent backup before changing anything, touch only your own entries, rollback/uninstall removes only your own entries. Before a write that changes `opencode.json` or one of Efficiency's command files, save a timestamped backup under `~/.config/opencode/.local-deploy-backups/geldmacher-efficiency/` and leave it after success or failure. A failed deploy restores those shared files from that backup. Uninstall removes only Efficiency's skills entries, its own command files, and its OpenCode package. Do not rewrite `opencode.jsonc` or delete another plugin's commands. A second deploy or uninstall that changes nothing does not write.
5. Treat `.build/plugins/agent-plugins/geldmacher-efficiency` as build and conformance output only. Never invent an Agent Plugins deploy flag or install it through this helper.
6. Report standard-target bundle generation separately from the selected native hosts, product and local versions, content hashes, destination paths, dirty provenance, applicable Codex cache verification, OpenCode registration, and whether hook trust needs manual review.
7. After a real deployment, tell the user to reload Cursor, start a new Codex task, and/or start a new OpenCode session for the hosts that changed. Do not claim live activation until those host-specific checks happen.

Stop on any manifest identity, path-boundary, symlink, validation, swap, rollback, Marketplace, or Codex cache error. Preserve the deploy command's verified/provisional distinction.
