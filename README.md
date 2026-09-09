<img src="assets/logo.svg" alt="Efficiency logo" width="72" height="72">

# Efficiency

**Simpler code. Leaner context. Clearer answers.**

Efficiency helps coding agents choose simpler solutions, keep context lean, and communicate clearly. For Cursor and Codex.

[Install](#install) · [Try it](#try-it) · [Usage guide](docs/usage.md)

[![Latest release](https://img.shields.io/github/v/release/geldmacher/efficiency)](https://github.com/geldmacher/efficiency/releases/latest)
[![Validate](https://github.com/geldmacher/efficiency/actions/workflows/validate.yml/badge.svg)](https://github.com/geldmacher/efficiency/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

- **Keep solutions simple.** Check what the task actually needs and what the project already provides before adding an abstraction or dependency.
- **Keep context useful.** Find repeated or misplaced instructions and suggest how to consolidate them without losing necessary guidance.
- **Make results easier to act on.** Match explanations and verification effort to the task, while preserving important evidence and uncertainty.

## See the approach

**You ask:** “Review this refactor for unnecessary complexity.”

**Example situation:** A change adds a configurable formatter registry, but the current requirement is one date format and the project already has a helper that supports it.

**Illustrative recommendation:** “Reuse the existing date helper. The registry adds configuration and another lookup path without meeting an additional requirement. Before changing it, verify that the helper preserves the required timezone and invalid-input behavior.”

This example illustrates the guidance; it is not a recorded agent run or a benchmark. Efficiency can also conclude that the existing design is already appropriate. Review requests do not edit code.

## Install

You need **Cursor or Codex with plugin support**, **Node.js 22 or newer**, and GitHub HTTPS access. RTK is optional. A release installation does not require Git or npm packages.

For a first installation, copy this request into Cursor or Codex:

```text
Install the latest stable Efficiency release from https://github.com/geldmacher/efficiency for my current app. Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md, section "First installation without the skill". Verify the release before installing and tell me whether a reload or new task is needed.
```

The installer verifies the selected release and retains backups when updating. After installation, reload Cursor or start a new Codex task, then try an example below. If the skill is missing, follow the [installation and recovery guide](docs/installation.md).

Already have Efficiency 3.3.0 or newer? Ask for an update with `/install-new-release-from-repo` in Cursor or `$geldmacher-efficiency:install-new-release-from-repo` in Codex. Add “preview only” to inspect the proposed installation.

## Try it

In **Cursor**, try one of these requests:

```text
/efficiency Review my current changes for unnecessary complexity.
/context-optimization Find repeated instructions in this project's agent context.
/efficiency Suggest the smallest sufficient verification for this change.
```

In **Codex**, use the same requests with `$geldmacher-efficiency:efficiency` or `$geldmacher-efficiency:context-optimization`.

Relevant skills can also be selected naturally during ordinary work. Explicit invocation gives you a clear starting point. For a review, name a file or proposal, or use the current Git changes; Efficiency asks for a focused scope when none is available.

## Workflows

| What you want to do | Skill / Cursor command |
| --- | --- |
| Review or simplify a solution; match effort to risk | `efficiency` |
| Reduce repeated context and instructions | `context-optimization` |
| Inspect or prepare optional RTK integration | `rtk-setup` |
| Filter noisy terminal output while preserving diagnostics | `rtk-filter-design` |
| Install or update a stable Efficiency release | `install-new-release-from-repo` |

Cursor also includes concise-response guidance. Codex offers it through the optional `response-simplicity-setup` skill. See the [usage guide](docs/usage.md) for host differences, review behavior, and examples.

## How it works

**Evidence-Guided Simplicity** means choosing the smallest solution supported by the requirements and repository: omit unnecessary work, reuse project capabilities, use the standard library, consider an existing dependency, then implement locally when needed.

YAGNI, KISS, and DRY guide that choice. Correctness, security, public interfaces, and necessary verification remain protected. RTK can reduce the terminal output sent to the model; that alone does not establish lower provider costs or whole-task savings.

Efficiency adds no custom MCP server, telemetry, or background automation. RTK integration and global response guidance are optional setup steps. [Read about behavior and boundaries](docs/usage.md#behavior-and-boundaries).

## Documentation and support

- [Installation, updates, and rollback](docs/installation.md)
- [Usage, compatibility, and troubleshooting](docs/usage.md)
- [Development, target bundles, and verification](docs/development.md) — includes the portable Agent Plugins v1 target.
- [Migration from older versions](docs/migrations.md)
- [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/geldmacher/efficiency/issues)

[MIT](LICENSE) · Built by [Dennis Geldmacher](https://github.com/geldmacher)
