# Efficiency

Internal Cursor cost controls for agent work: RTK-backed shell usage, targeted context gathering, bounded validation, context usage optimization, and evidence-based efficiency review.

The plugin treats efficiency as net savings: reduced shell and context tokens minus the context, validation, and reviewer overhead introduced by the plugin itself. It does not ship telemetry, persist project metrics, or replace task workflow guidance.

## Compatibility

| Component | Supported baseline |
| --- | --- |
| Cursor | 3.10.20 tested; older versions are best effort |
| RTK | 0.43.0 or newer |
| Development | Node.js 22 |
| Platforms | macOS, Linux, and WSL |

Native Windows can run RTK commands and filters, but transparent Cursor rewriting requires the Unix hook environment provided by WSL.

## Installation

Clone the repository directly into Cursor's local plugin directory:

```bash
git clone git@github.com:geldmacher/efficiency.git ~/.cursor/plugins/local/geldmacher-efficiency
```

For development, keep the repository elsewhere and link it into `~/.cursor/plugins/local/geldmacher-efficiency`. After installation or updates, run `Developer: Reload Window` or fully restart Cursor.

If the plugin or its commands are missing, verify that Cursor's setting for third-party plugins, skills, and other agent configurations is enabled.

## Usage

1. Run `/setup-rtk` once per machine. It verifies the correct RTK binary, inspects the existing Cursor hook, previews changes, and requires confirmation before global setup.
2. Run `/create-rtk-filter` for project-specific `.rtk/filters.toml` coverage, especially DDEV command wrappers.
3. Run `/cost-budget` when a task needs explicit context, command, dry-run, validation, and stop limits.
4. Run `/plan-context-optimization` with Cursor Context Usage Analysis data to prepare a readonly optimization plan.
5. Run `/execute-context-optimization` only after approving a concrete plan.
6. Run `/efficiency-review` after meaningful work to assess RTK savings, context discipline, validation economy, and reviewer overhead.

Commands are the user-facing slash-command surface. Skills contain the detailed reusable workflows. Readonly agents are delegated only when fixed complexity thresholds justify the additional model call.

## Cost measurement

The plugin uses this project-scoped RTK snapshot:

```bash
rtk gain --project --format json
```

It reports command count, input and output tokens, saved tokens, and average savings percentage. These are cumulative project values. A task delta is reported only when `/cost-budget` captured a baseline earlier in the same task.

`rtk discover` and `rtk session` are not used as Cursor metrics because they currently inspect Claude Code history. Monetary cost is calculated only when the user provides model-specific input and output token prices.

## Components

- **Commands**: `/setup-rtk`, `/create-rtk-filter`, `/cost-budget`, `/plan-context-optimization`, `/execute-context-optimization`, `/efficiency-review`.
- **Skills**: `rtk-cursor-setup`, `project-rtk-filter`, `cost-reduction`, `context-usage-optimizer`, `efficiency-review`.
- **Agents**: `efficiency-reviewer`, `rtk-filter-reviewer`, and `context-optimization-reviewer` for threshold-based readonly review.
- **Rules**: a small always-on `cursor-efficiency` core, conditional `rtk-filter-maintenance`, and file-scoped `context-optimization-safety`.

## RTK safety

`/setup-rtk` runs `rtk gain` to distinguish Rust Token Killer from the unrelated binary with the same name. It inspects `rtk init --show`, runs `rtk init --global --agent cursor --dry-run -v`, and requires explicit confirmation before applying or uninstalling global integration.

Project filters must pass:

```bash
rtk verify --require-all
```

Warnings that untrusted project filters were skipped mean validation is incomplete. The user must run `rtk trust` from the project root before verification is retried.

## Development

Install the pinned development dependencies and run each gate:

```bash
npm ci
npm run validate
npm test
npm run context-budget
```

The validator uses a pinned copy of Cursor's official plugin schema plus semantic component checks. The context budget estimates tokens with `characters / 4` and enforces:

- always-on rules: at most 250 tokens
- discoverability metadata: at most 250 tokens
- total plugin baseline: at most 500 tokens

For v0.4, the estimated baseline fell from approximately 919 to 389 tokens, a 58% reduction under the same `characters / 4` method.

Before tagging a release, complete [the manual Cursor release checklist](docs/release-checklist.md). See [CHANGELOG.md](CHANGELOG.md) for version history.

This repository does not need an `AGENTS.md`: Cursor discovers the plugin's declared commands, skills, agents, and rules directly from `plugin.json`.

## Troubleshooting

- **`rtk gain` is not recognized:** another package named `rtk` is installed. Follow the official RTK installation guide.
- **Cursor hook is missing:** run `rtk init --show`; `/setup-rtk` can preview the supported installation.
- **Plugin is not visible:** confirm the local plugin path, enable third-party agent configurations, and reload Cursor.
- **Filters are skipped as untrusted:** run `rtk trust` manually from the project root, then rerun `rtk verify --require-all`.
- **Native Windows hook is missing:** use Cursor and RTK inside WSL for transparent rewriting.

## References

- [Cursor plugin specification](https://github.com/cursor/plugins)
- [RTK supported agents](https://www.rtk-ai.app/docs/getting-started/supported-agents/)
- [RTK installation](https://www.rtk-ai.app/docs/getting-started/installation/)
- [RTK configuration](https://www.rtk-ai.app/docs/getting-started/configuration/)
