# Efficiency for OpenCode

**Help your coding agent do useful work with less unnecessary complexity.**

Efficiency helps your coding agent choose simpler solutions, keep context lean, and communicate clearly in OpenCode 2.1.2.

This package targets [OpenCode 2.1.2](https://opencode.ai/changelog) only (`npm` package `@opencode/cli`). The `opencode-ai` package remains OpenCode 1.x and is not supported. Skill discovery follows the [OpenCode 2.1 skills guide](https://opencode.ai/v2/docs/skills/). Slash commands follow the [commands guide](https://opencode.ai/v2/docs/commands/).

OpenCode config (opencode.json, commands/) is shared with Workflow and Design: merge only, always write a persistent backup before changing anything, touch only your own entries, rollback/uninstall removes only your own entries.

## Install or update from a release

Use the [latest stable GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). You need Node.js 22 or newer for the release helper.

**Manually:** download `geldmacher-efficiency-opencode-<tag>.zip`, `SHA256SUMS`, and `provenance.json` from the same release, then follow [manual installation](../../docs/installation.md#manual-installation) or [manual update](../../docs/installation.md#manual-update).

**With your agent:** paste this into OpenCode:

> Install the latest stable Efficiency release from https://github.com/geldmacher/efficiency for OpenCode. Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md, section "First installation without the skill". Verify the release before installing.

**Update with your agent:**

> @install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for OpenCode.

`/install-new-release-from-repo` sends the same request. Start a new OpenCode session after installation. The [installation guide](../../docs/installation.md) covers recovery.

## How skills are selected

OpenCode lists each skill that has a description. Model auto-invocation stays enabled: these skills do not set `opencode/autoinvoke` or `disable-model-invocation`. You can also select one yourself:

- Type `@efficiency` to load that skill by id.
- Type `/efficiency` to run the matching command, which loads the same skill.

The same pair works for `context-optimization`, `rtk-setup`, `rtk-update`, `rtk-filter-design`, and `install-new-release-from-repo`.

Try a focused review:

> @efficiency Review my current changes for unnecessary complexity.

Files stay unchanged until you ask for a specific change. See [usage examples](../../docs/usage.md).

This package does not install a global instruction file. Cursor's always-applied rule and Codex's optional response guidance are not copied into OpenCode. RTK host integration on OpenCode stays unverified unless that host documents a path; do not apply Cursor or Codex RTK setup to it.
