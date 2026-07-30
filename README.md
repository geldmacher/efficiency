# Efficiency

Efficiency is a lightweight Cursor plugin for concise model responses, deliberate RTK usage, context economy, proportional validation, and evidence-based efficiency reviews. Its commands and skills remain opt-in; one minimal always-on rule improves response clarity without imposing a compressed writing style.

## What it provides

| Command | Purpose | Backing skill |
| --- | --- | --- |
| `/setup-rtk` | Inspect or prepare RTK's native Cursor integration | `rtk-setup` |
| `/create-rtk-filter` | Design safe project-specific RTK filters | `rtk-filter-design` |
| `/budget-efficiency` | Set a proportional efficiency budget for a task | `efficiency-budget` |
| `/optimize-context` | Analyze or improve recurring Cursor context | `context-optimization` |
| `/review-efficiency` | Review resource, context, communication, and validation economy | `efficiency-review` |

The `response-simplicity` rule applies a small set of general response principles: lead with the outcome, remove filler and repetition, use natural complete sentences, and preserve evidence, uncertainty, risks, approvals, validation status, and exact technical content.

Three optional read-only auditors provide independent review when the extra model call is justified:

- `rtk-filter-auditor` checks matcher precision, diagnostic preservation, and verification evidence.
- `context-change-auditor` checks that context reductions preserve important constraints.
- `efficiency-auditor` checks whether resource and validation effort were proportional.

## Design boundaries

- The only always-on context is the short `response-simplicity` rule. The plugin has no custom runtime hooks, MCP servers, or telemetry.
- Response economy must not remove material evidence, uncertainty, risks, blockers, approvals, validation status, or exact technical content.
- RTK remains optional. Only `/setup-rtk` concerns machine-level integration, and it previews changes before an explicitly requested application.
- Auditors analyze supplied evidence and do not modify files.
- Efficiency guidance does not replace functional correctness, security review, project requirements, or Cursor's native approvals.
- RTK statistics are cumulative unless a same-task baseline and comparison are available.

## Requirements

| Component | Requirement |
| --- | --- |
| Cursor | A version with local plugin support enabled |
| RTK | Optional; 0.44.0 is the locally verified baseline for the native Cursor hook |
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

The response rule applies automatically when Cursor loads it; it does not require a command. Repository validation proves its declaration and content, while a fresh real Cursor session is required to prove that the active Cursor version applies a plugin-sourced always-on rule.

1. Run `/setup-rtk` to inspect the installed RTK binary and current Cursor integration. Request setup explicitly if the dry-run is correct. A Cursor hook result of `ask` with an RTK `updated_input` is a working approval path, not a failed rewrite.
2. Run `/create-rtk-filter` in a project with recurring noisy finite commands. Review fixtures, complete `rtk verify --require-all`, and use RTK's native `rtk trust` flow. Re-trust the filter after any edit before relying on it in the Cursor hook path.
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
rules/                      Minimal always-on response guidance
assets/                     Plugin artwork
schemas/                    Vendored Cursor manifest schema
scripts/                    Validation utilities
tests/                      Structural and policy tests
docs/                       Release documentation
```

## Troubleshooting

- **`rtk gain` fails:** verify that Rust Token Killer, rather than an unrelated `rtk` binary, is installed.
- **The plugin is missing:** verify the local path, local-plugin policy, and `.cursor-plugin/plugin.json`, then reload Cursor.
- **Project filters are skipped:** with RTK 0.44.0 or newer, custom TOML filters are trust-gated in the Cursor hook path. Complete `rtk trust` from the intended project root and re-trust the filter after edits before rerunning `rtk verify --require-all`.
- **Hook rewriting is uncertain:** use `rtk hook check --agent cursor '<finite-command>'`, then inspect the real Cursor hook result and run a finite smoke check. `allow` may run immediately; `ask` must request native approval while retaining the RTK `updated_input`. Confirm execution with `rtk gain --history`. Successful filter execution alone does not prove hook rewriting.
- **The response rule is not always applied:** confirm that `response-simplicity` appears as always applied after reloading Cursor, then verify it in a fresh conversation. If Cursor downgrades or omits the plugin rule, record the Cursor version and treat runtime activation as unverified rather than inferring success from `alwaysApply: true`.

## References

- [Cursor plugin specification](https://github.com/cursor/plugins)
- [RTK documentation](https://www.rtk-ai.app/docs/)
- [RTK 0.44.0 release notes](https://github.com/rtk-ai/rtk/releases/tag/v0.44.0)

## License

[MIT](LICENSE)
