# Efficiency

Cursor cost controls for agent work: RTK-backed shell usage, targeted context gathering, context usage optimization, bounded command output, lean validation, and concrete efficiency review.

This plugin is intentionally small. It does not ship a custom Cursor hook. RTK integration is delegated to RTK's supported Cursor setup through `rtk init --global --agent cursor`.

It is not a workflow plugin and does not define handoffs, implementation roles, delivery-review loops, or task execution packets.

## Installation

Copy or clone this repository to `~/.cursor/plugins/local/geldmacher-efficiency/` so Cursor discovers it automatically, or install it from a marketplace that lists this repository.

## Usage

Use the plugin when a Cursor session should spend fewer tokens and avoid broad exploratory churn.

1. Run `/setup-rtk` once per machine to verify RTK and prepare Cursor's RTK integration.
2. Run `/create-rtk-filter` when a repository needs project-specific `.rtk/filters.toml` coverage, especially for DDEV command wrappers.
3. Run `/cost-budget` when a session needs explicit cost guardrails for context, commands, dry-runs, validation, and stop conditions.
4. Run `/plan-context-optimization` with a Cursor Context Usage Analysis when recurring context usage should be reduced durably.
5. Run `/execute-context-optimization` only after approving a concrete optimization plan.
6. Run `/efficiency-review` after meaningful work to find wasted context, missed RTK usage, validation cost issues, and cost controls to improve next time.

## Components

- **Commands**: `/setup-rtk`, `/create-rtk-filter`, `/cost-budget`, `/plan-context-optimization`, `/execute-context-optimization`, `/efficiency-review`.
- **Skills**: `rtk-cursor-setup`, `project-rtk-filter`, `cost-reduction`, `context-usage-optimizer`, `efficiency-review`.
- **Agents**: `efficiency-reviewer` for readonly cost review, `rtk-filter-reviewer` for readonly review of project RTK filter changes, and `context-optimization-reviewer` for readonly review of context-optimization changes.
- **Rules**: `cursor-efficiency`, an always-on rule for RTK-first shell usage, targeted reads, `rg` before broad scans, dry-runs before global setup, and escalation instead of costly guessing; `rtk-filter-maintenance`, an always-on rule to keep project-specific RTK filters aligned with local commands and DDEV wrappers; `context-optimization-safety`, an opt-in rule for edits to agent guidance and docs.

## RTK Integration

`/setup-rtk` verifies RTK and guides Cursor's supported RTK integration. It previews setup before applying changes and must not install RTK or mutate global Cursor configuration without explicit confirmation.

`/create-rtk-filter` inventories project-specific command surfaces and creates or updates `.rtk/filters.toml` with conservative tested filters. It is DDEV-aware and avoids filtering long-running dev servers, watchers, interactive shells, or streaming log commands.

## Cost Budget

`/cost-budget` produces compact cost controls for a Cursor session. It is deliberately not an implementation plan and can be used alongside Cursor's native planning or the workflow plugin.

## Context Usage Optimization

`/plan-context-optimization` analyzes Cursor Context Usage Analysis data and produces a readonly plan for durable token reductions. It classifies drivers into conversation history, always-loaded repo guidance, skills, MCPs/plugins, and tool-call history.

`/execute-context-optimization` applies an approved plan only. It preserves mandatory security, environment, deployment, logging, domain-boundary, and verification constraints; measures before/after token estimates; and runs the cheapest relevant validation.

Use `context-optimization-reviewer` after risky reductions to check that mandatory constraints remain available and detailed workflows are still discoverable.

## Development

This repository intentionally does not include an `AGENTS.md` file because Cursor injects it automatically when the plugin is loaded. Agent-facing plugin behavior belongs in `commands/`, `skills/`, `agents/`, and `rules/`; human-facing usage and maintenance notes belong in this README.

Before publishing or submitting the plugin, validate it with:

```bash
node scripts/validate-plugin.mjs
```

## References

- [RTK supported agents](https://www.rtk-ai.app/docs/getting-started/supported-agents/)
- [RTK installation](https://www.rtk-ai.app/docs/getting-started/installation/)
- [RTK configuration](https://www.rtk-ai.app/docs/getting-started/configuration/)
