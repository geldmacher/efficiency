# Efficiency

Efficiency is a lightweight Cursor plugin for concise model responses, deliberate RTK usage, context economy, and proportional validation. Its commands and skills remain opt-in; one minimal always-on rule improves response clarity without imposing a compressed writing style.

## What it provides

| Command | Purpose | Backing skill |
| --- | --- | --- |
| `/setup-rtk` | Inspect or prepare RTK's native Cursor integration | `rtk-setup` |
| `/create-rtk-filter` | Design safe project-specific RTK filters | `rtk-filter-design` |
| `/efficiency` | Set or review proportional task effort and scoped code simplicity | `efficiency` |
| `/optimize-context` | Analyze or improve recurring Cursor context | `context-optimization` |

The `response-simplicity` rule leads with outcomes, removes filler and repetition, uses natural complete sentences, and preserves evidence, uncertainty, risks, approvals, validation status, and exact technical content.

Two optional read-only auditors provide independent review when the extra model call is justified:

- `rtk-filter-auditor` checks matcher precision, diagnostic preservation, and verification evidence.
- `efficiency-auditor` checks task economy, whether a context reduction preserves material constraints, or scoped code simplicity.

## Design boundaries

- The only always-on context is the short `response-simplicity` rule. The plugin has no custom runtime hooks, MCP servers, or telemetry.
- **AI-Slop** is used only as shorthand for low-value generated output. Efficiency evaluates observable utility, not whether text appears AI-written.
- A low-value finding must identify the concrete output, artifact, or step, explain why it did not materially improve the result, a decision, or necessary verification, and propose a practical adjustment.
- Response economy must not remove material evidence, uncertainty, risks, blockers, approvals, validation status, or exact technical content.
- RTK remains optional. Only `/setup-rtk` concerns machine-level integration, and it previews changes before an explicitly requested application.
- Auditors analyze supplied evidence and do not modify files.
- Efficiency guidance does not replace functional correctness, security review, project requirements, or Cursor's native approvals.
- RTK statistics are cumulative unless a same-task baseline and comparison are available.
- Code-simplicity reviews default to the current Git change set and remain read-only unless the user explicitly requests a scoped change.
- Code simplification preserves observable behavior, public interfaces, persisted formats, security, performance, and project conventions unless the user authorizes otherwise.

## Requirements

| Component | Requirement |
| --- | --- |
| Cursor | A version with local plugin support enabled |
| RTK | Optional; 0.44.0 is the locally verified baseline for the native Cursor hook |
| Development | Node.js 22 or newer |
| Platforms | macOS, Linux, or WSL for RTK's Cursor hook workflow |

`minClientVersions` remains unset until a tested compatibility range exists. Release receipts record the exact Cursor version used for live verification.

## Local installation

Clone the public repository directly into Cursor's local plugin directory:

```bash
git clone https://github.com/geldmacher/efficiency.git ~/.cursor/plugins/local/geldmacher-efficiency
```

SSH is an alternative for an already configured GitHub account:

```bash
git clone git@github.com:geldmacher/efficiency.git ~/.cursor/plugins/local/geldmacher-efficiency
```

For development from another directory, link the repository instead:

```bash
ln -s /absolute/path/to/efficiency ~/.cursor/plugins/local/geldmacher-efficiency
```

Reload Cursor with `Developer: Reload Window` or restart it afterward.

## Typical usage

The response rule applies automatically when Cursor loads it; it does not require a command. Repository validation proves its declaration and content, while a fresh real Cursor session is required to prove plugin discovery and runtime behavior.

1. Run `/setup-rtk` to inspect the installed RTK binary and current Cursor integration. A Cursor hook result of `ask` with an RTK `updated_input` is a working approval path, not a failed rewrite.
2. Run `/create-rtk-filter` for recurring noisy finite commands. Complete `rtk verify --require-all`, use RTK's native `rtk trust` flow, and re-trust the filter after every edit.
3. Run `/efficiency` before, during, or after meaningful work. The skill infers whether to set a budget, adjust execution, review the result, or assess scoped code simplicity.
4. Run `/optimize-context` when recurring instructions or duplicated guidance inflate every session.

Code simplicity uses natural-language intent rather than a new subcommand:

```text
/efficiency Review the current changes for code simplicity
/efficiency Simplify src/example.ts without changing behavior
```

Without an explicit path, the review covers staged, unstaged, and Git-reported untracked files. If no Git changes are available, the skill asks for a focused scope instead of reviewing the whole repository. Review requests never edit code; explicit change requests stay within the approved scope and run the relevant existing checks afterward.

## Migrating from 1.x

Efficiency 2.0 deliberately removes compatibility aliases:

| 1.x entry point | 2.0 replacement |
| --- | --- |
| `/budget-efficiency` | `/efficiency` with a before-work request |
| `/review-efficiency` | `/efficiency` with an in-progress or after-work request |
| `efficiency-budget` | `efficiency` |
| `efficiency-review` | `efficiency` |
| `context-change-auditor` | `efficiency-auditor` with a context focus |

## Development

Install the lockfile-defined dependencies and run the complete local gate:

```bash
npm ci
npm run release-check
git diff --check
```

The release check separates Cursor manifest/component validation from repository policy, verifies relative Markdown links, and runs structural and policy contract tests. Before tagging a release, complete the [release checklist](docs/release-checklist.md), execute the [runtime smoke](docs/runtime-smoke.md), and update the [changelog](CHANGELOG.md).

## Repository layout

```text
.cursor-plugin/plugin.json  Plugin metadata and component paths
agents/                     Optional read-only auditors
commands/                   User-facing slash commands
skills/                     Reusable workflows and references
rules/                      Minimal always-on response guidance
assets/                     Plugin artwork
schemas/                    Vendored Cursor schema and provenance
scripts/                    Validation utilities
tests/                      Structural and policy tests
docs/                       Release and runtime verification material
```

## Troubleshooting

- **`rtk gain` fails:** verify that Rust Token Killer, rather than an unrelated `rtk` binary, is installed.
- **The plugin is missing:** verify the local path, local-plugin policy, and `.cursor-plugin/plugin.json`, then reload Cursor.
- **Project filters are skipped:** complete `rtk trust` from the intended project root and re-trust after filter edits before rerunning `rtk verify --require-all`.
- **Hook rewriting is uncertain:** inspect `rtk hook check --agent cursor '<finite-command>'`, the real Cursor `updated_input`, the native permission result, and `rtk gain --history`.
- **The response rule is not applied:** confirm that `response-simplicity` is always applied after reloading Cursor, then verify it in a fresh conversation. Treat missing runtime evidence as unverified rather than inferring success from `alwaysApply: true`.

## References

- [Cursor plugin specification](https://github.com/cursor/plugins)
- [RTK documentation](https://www.rtk-ai.app/docs/)
- [RTK 0.44.0 release notes](https://github.com/rtk-ai/rtk/releases/tag/v0.44.0)

## License

[MIT](LICENSE)
