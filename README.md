# Geldmacher Efficiency

Cursor workflows for cost-efficient agent work: RTK-backed shell usage, targeted context gathering, compact execution plans, and concrete efficiency review.

This plugin is intentionally small. It does not ship a custom Cursor hook in v0.1. RTK integration is delegated to RTK's supported Cursor setup through `rtk init --global --agent cursor`.

## Installation

Copy or clone this repository to `~/.cursor/plugins/local/geldmacher-efficiency/` so Cursor discovers it automatically, or install it from a marketplace that lists this repository.

## Usage

Use the plugin when a Cursor session should spend fewer tokens and avoid broad exploratory churn.

1. Run `/setup-rtk` once per machine to verify RTK and prepare Cursor's RTK integration.
2. Run `/efficiency-plan` when a request should become a compact, cost-aware implementation packet.
3. Execute the packet with normal Cursor tools while following the always-on efficiency rule.
4. Run `/efficiency-review` after meaningful work to find wasted context, missed RTK usage, skipped validation, and cheaper next steps.

## Components

- **Commands**: `/setup-rtk`, `/efficiency-plan`, `/efficiency-review`.
- **Skills**: `rtk-cursor-setup`, `cost-efficient-execution`, `efficiency-review`.
- **Agent**: `efficiency-reviewer`, a readonly review role focused on efficiency gaps and concrete follow-up.
- **Rule**: `cursor-efficiency`, an always-on rule for RTK-first shell usage, targeted reads, `rg` before broad scans, dry-runs before global setup, and escalation instead of expensive guessing.

## RTK Integration

`/setup-rtk` follows this safety model:

1. Verify RTK is available with `rtk --version` and `command -v rtk`.
2. If RTK is missing, show the official RTK installation documentation and stop.
3. Run `rtk init --global --agent cursor --dry-run` first.
4. Summarize the dry-run result.
5. Ask for explicit confirmation before running `rtk init --global --agent cursor`.
6. After setup, instruct the user to restart Cursor and verify RTK-backed shell behavior.

The plugin never installs RTK or mutates global Cursor configuration without explicit user confirmation.

## Cost-Aware Execution Packet

`/efficiency-plan` produces a compact packet with these sections:

1. `Intent and success condition`
2. `Scope and non-goals`
3. `Context budget`
4. `Target files and symbols`
5. `RTK shell plan`
6. `Executable agent plan`
7. `Verification`
8. `Escalate instead of guessing when`
9. `Open questions`

Execution-critical uncertainty must be clarified before producing the packet. `Open questions` is only for non-blocking follow-up.

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
