# Geldmacher Efficiency

Cursor cost controls for agent work: RTK-backed shell usage, targeted context gathering, bounded command output, lean validation, and concrete efficiency review.

This plugin is intentionally small. It does not ship a custom Cursor hook in v0.1. RTK integration is delegated to RTK's supported Cursor setup through `rtk init --global --agent cursor`.

It does not replace the workflow plugin. It does not define handoffs, implementation roles, delivery-review loops, or task execution packets. Its job is only to reduce avoidable Cursor cost.

## Installation

Copy or clone this repository to `~/.cursor/plugins/local/geldmacher-efficiency/` so Cursor discovers it automatically, or install it from a marketplace that lists this repository.

## Usage

Use the plugin when a Cursor session should spend fewer tokens and avoid broad exploratory churn.

1. Run `/setup-rtk` once per machine to verify RTK and prepare Cursor's RTK integration.
2. Run `/cost-budget` when a session needs explicit cost guardrails for context, commands, dry-runs, validation, and stop conditions.
3. Use Cursor or the workflow plugin for actual task planning and execution.
4. Run `/efficiency-review` after meaningful work to find wasted context, missed RTK usage, validation cost issues, and cost controls to improve next time.

## Components

- **Commands**: `/setup-rtk`, `/cost-budget`, `/efficiency-review`.
- **Skills**: `rtk-cursor-setup`, `cost-reduction`, `efficiency-review`.
- **Agent**: `efficiency-reviewer`, a readonly review role focused on cost gaps and missed reduction measures.
- **Rule**: `cursor-efficiency`, an always-on rule for RTK-first shell usage, targeted reads, `rg` before broad scans, dry-runs before global setup, and escalation instead of costly guessing.

## RTK Integration

`/setup-rtk` follows this safety model:

1. Verify RTK is available with `rtk --version` and `command -v rtk`.
2. If RTK is missing, show the official RTK installation documentation and stop.
3. Run `rtk init --global --agent cursor --dry-run` first.
4. Summarize the dry-run result.
5. Ask for explicit confirmation before running `rtk init --global --agent cursor`.
6. After setup, instruct the user to restart Cursor and verify RTK-backed shell behavior.

The plugin never installs RTK or mutates global Cursor configuration without explicit user confirmation.

## Cost Budget

`/cost-budget` produces a compact set of cost controls with these sections:

1. `Cost objective`
2. `RTK requirements`
3. `Context limits`
4. `Shell-output limits`
5. `Dry-run requirements`
6. `Validation budget`
7. `Stop and ask when`

The budget is deliberately not an implementation plan. Each item must be a cost-saving constraint or procedure that can be used alongside Cursor's native planning or the workflow plugin.

## Publishing Notes

Before publishing or submitting the plugin, run:

```bash
node scripts/validate-plugin.mjs
```

The validator checks `.cursor-plugin/plugin.json`, the configured logo path, and required frontmatter for commands, skills, agents, and rules.

## References

- [Cursor Plugins documentation](https://cursor.com/docs/plugins)
- [cursor/plugin-template](https://github.com/cursor/plugin-template)
- [RTK supported agents](https://www.rtk-ai.app/docs/getting-started/supported-agents/)
- [RTK installation](https://www.rtk-ai.app/docs/getting-started/installation/)
- [RTK configuration](https://www.rtk-ai.app/docs/getting-started/configuration/)
