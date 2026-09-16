<img src="assets/logo.svg" alt="Efficiency logo" width="72" height="72">

# Efficiency

**Help your coding agent do useful work with less unnecessary complexity.**

Efficiency is a plugin for **Cursor and Codex**. It gives your agent guidance to:

- **Keep code easier to maintain:** reuse what your project already provides and avoid abstractions the task does not need.
- **Keep instructions easier to manage:** find duplicated or misplaced guidance in files such as `AGENTS.md`, rules, and skills.
- **Make results easier to act on:** explain what changed, what was checked, and what you need to do next.

[![Latest release](https://img.shields.io/github/v/release/geldmacher/efficiency)](https://github.com/geldmacher/efficiency/releases/latest)
[![Validate](https://github.com/geldmacher/efficiency/actions/workflows/validate.yml/badge.svg)](https://github.com/geldmacher/efficiency/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Install

You need Cursor or Codex with plugin support, **Node.js 22 or newer**, and access to GitHub. You do not need to clone this repository.

**Copy this request into Cursor or Codex:**

```text
Install the latest stable Efficiency release from
https://github.com/geldmacher/efficiency for my current app.
Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md,
section "First installation without the skill".
Verify the release before installing and tell me whether a reload or new task is needed.
```

Your agent downloads and verifies the release, installs it for your app, and reports any remaining activation step. Reload Cursor or, once installation is complete in Codex, start a new task.

Already installed? Follow the [update instructions](docs/installation.md#update-efficiency). For manual installation or help with a failed install, see the [installation guide](docs/installation.md).

## Try it

Open a project with code changes and ask for a review.

**Cursor:**

```text
/efficiency Review my current changes for unnecessary complexity.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Review my current changes for unnecessary complexity.
```

For example, if a change adds a configurable formatter but the project already has a suitable date helper, Efficiency can recommend reusing that helper and explain what needs checking. A review gives recommendations; ask for an implementation when you want changes made.

The [usage guide](docs/usage.md) has examples for code reviews, agent instructions, verification, and clearer change summaries. It also covers optional **RTK** integration, which reduces the terminal output sent to the agent. RTK is not required to use Efficiency.

## Learn more

- [Usage and examples](docs/usage.md)
- [Installation, updates, and recovery](docs/installation.md)
- [Contributing and development](https://github.com/geldmacher/efficiency/blob/main/docs/development.md)
- [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/geldmacher/efficiency/issues)

[MIT](LICENSE) · Built by [Dennis Geldmacher](https://github.com/geldmacher)
