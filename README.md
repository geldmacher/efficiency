# Efficiency

Efficiency is a lightweight Cursor plugin for deliberate RTK usage, context economy, proportional validation, and evidence-based efficiency reviews. It provides opt-in commands and skills instead of adding recurring instructions to every agent turn.

## What it provides

| Command | Purpose | Backing skill |
| --- | --- | --- |
| `/setup-rtk` | Inspect or prepare RTK's native Cursor integration | `rtk-setup` |
| `/create-rtk-filter` | Design safe project-specific RTK filters | `rtk-filter-design` |
| `/budget-efficiency` | Set a proportional efficiency budget for a task | `efficiency-budget` |
| `/optimize-context` | Analyze or improve recurring Cursor context | `context-optimization` |
| `/review-efficiency` | Review resource, context, communication, and validation economy | `efficiency-review` |

Three optional read-only auditors provide independent review when the extra model call is justified:

- `rtk-filter-auditor` checks matcher precision, diagnostic preservation, and verification evidence.
- `context-change-auditor` checks that context reductions preserve important constraints.
- `efficiency-auditor` checks whether resource and validation effort were proportional.

## Design boundaries

- The plugin has no always-on rules, hooks, MCP servers, or telemetry.
- RTK remains optional. Only `/setup-rtk` concerns machine-level integration, and it previews changes before an explicitly requested application.
- Auditors analyze supplied evidence and do not modify files.
- Efficiency guidance does not replace functional correctness, security review, project requirements, or Cursor's native approvals.
- RTK statistics are cumulative unless a same-task baseline and comparison are available.

## Requirements

| Component | Requirement |
| --- | --- |
| Cursor | A version with local plugin support enabled |
| RTK | Optional; 0.43.0 is the locally verified baseline |
| Development | Node.js 22 or newer |
| Platforms | macOS, Linux, or WSL for RTK's Cursor hook workflow |

## Local installation

Clone directly into Cursor's local plugin directory:

```bash
git clone git@github.com:geldmacher/efficiency.git ~/.cursor/plugins/local/geldmacher-efficiency
```

For development from another directory, link the repository instead:

```bash
ln -s /absolute/path/to/efficiency ~/.cursor/plugins/local/geldmacher-efficiency
```

Reload Cursor with `Developer: Reload Window` or restart it. If the plugin is not visible, confirm that local or third-party plugins are permitted in the active Cursor profile or organization.

## Typical usage

1. Run `/setup-rtk` to inspect the installed RTK binary and current Cursor integration. Request setup explicitly if the dry-run is correct.
2. Run `/create-rtk-filter` in a project with recurring noisy finite commands. Review fixtures and complete `rtk verify --require-all` after the project is trusted.
3. Use `/budget-efficiency` before an unusually broad or tool-heavy task.
4. Use `/optimize-context` when recurring instructions or duplicated guidance inflate every session.
5. Use `/review-efficiency` after meaningful work when the available evidence supports a useful assessment.

## Development

Install the pinned dependencies and run the complete local gate:

```bash
npm ci
npm run release-check
```

The release check validates the manifest and component metadata, rejects unsafe or missing component paths, checks Markdown links, and runs behavior tests. Before tagging a release, also complete the [manual release checklist](docs/release-checklist.md) and update the [changelog](CHANGELOG.md).

## Repository layout

```text
.cursor-plugin/plugin.json  Plugin metadata and component paths
agents/                     Optional read-only auditors
commands/                   User-facing slash commands
skills/                     Reusable workflows and references
assets/                     Plugin artwork
schemas/                    Vendored Cursor manifest schema
scripts/                    Validation utilities
tests/                      Structural and policy tests
docs/                       Release documentation
```

## Troubleshooting

- **`rtk gain` fails:** verify that Rust Token Killer, rather than an unrelated `rtk` binary, is installed.
- **The plugin is missing:** verify the local path, local-plugin policy, and `.cursor-plugin/plugin.json`, then reload Cursor.
- **Project filters are skipped:** trust is a separate user action; complete it from the intended project root before rerunning `rtk verify --require-all`.
- **Hook rewriting is uncertain:** use `rtk hook check --agent cursor '<finite-command>'`; successful filter execution alone does not prove hook rewriting.

## References

- [Cursor plugin specification](https://github.com/cursor/plugins)
- [RTK documentation](https://www.rtk-ai.app/docs/)

## License

[MIT](LICENSE)
