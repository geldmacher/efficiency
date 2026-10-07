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

## Quick start

### 1. Install and activate

Use the [installation request below](#install-from-a-release) or follow the [manual installation steps](docs/installation.md#manual-installation). Complete your app's [activation steps](docs/installation.md#finish-installation): reload Cursor or, after installation is complete in Codex, start a new task.

### 2. Choose whether to use the persistent guidance

- **Cursor:** the plugin's short rule for clear responses and simple, in-scope code changes applies automatically.
- **Codex:** equivalent guidance across projects is an optional, separate setup. Plugin installation alone does not configure it. You can use the skills without this setup.

To check or preview the Codex setup, copy this request:

```text
$geldmacher-efficiency:response-simplicity-setup Show the current status and preview setup of persistent response guidance. Do not change configuration.
```

The preview shows the proposed change to your global instructions. To configure it, approve the displayed patch and request that it be applied, then start a new task. See [setup and removal](docs/installation.md#optional-codex-response-guidance).

### 3. Try a focused review

Open a project with code changes and ask:

**Cursor:**

```text
/efficiency Review my current changes for unnecessary complexity.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Review my current changes for unnecessary complexity.
```

You get recommendations tied to the requirement and the code; files stay unchanged. For example, Efficiency may suggest reusing an existing date helper instead of adding a configurable formatter. To make a change, request the selected recommendation and its scope. See [review and implementation examples](docs/usage.md#review-or-simplify-code).

## Recommended everyday use

Give your agent the task you want completed. In Cursor, or once the optional Codex guidance is configured, the short rule accompanies ordinary work. Call a skill when you need a focused review, assessment, or change text; ordinary tasks need no separate efficiency report.

| Situation | Recommended use |
| --- | --- |
| An ordinary development task | Describe the required change and its scope as usual. |
| A change seems unnecessarily complex | Ask `efficiency` for a [focused review](docs/usage.md#review-or-simplify-code). |
| Effort or useful checks are unclear | Ask `efficiency` to [assess the work](docs/usage.md#keep-debugging-and-repeated-work-focused) or [plan verification](docs/usage.md#choose-what-to-check). |
| Project instructions are hard to follow | Ask `context-optimization` to [review the instructions](docs/usage.md#improve-agent-instructions). |
| Terminal output is extensive | Optionally ask `rtk-setup` to [check RTK integration](docs/usage.md#reduce-terminal-output-with-rtk-optional). |

The [usage guide](docs/usage.md) has copyable requests for both apps, expected results, and next steps. Efficiency keeps agreed requirements and necessary checks intact. Optional **RTK** reduces terminal output; that alone does not establish lower total task cost.

## Install from a release

You need Cursor or Codex with plugin support, **Node.js 22 or newer**, and access to GitHub. You do not need to clone this repository.

Copy this request into Cursor or Codex:

```text
Install the latest stable Efficiency release from
https://github.com/geldmacher/efficiency for my current app.
Follow https://github.com/geldmacher/efficiency/blob/main/docs/installation.md,
section "First installation without the skill".
Verify the release before installing and tell me whether a reload or new task is needed.
```

Your agent downloads and verifies the release, installs it for your app, and reports any remaining activation step. For a manual installation, use the [latest stable GitHub Release](https://github.com/geldmacher/efficiency/releases/latest) and follow the [verification and installation procedure](docs/installation.md#manual-installation).

## Update from a release

Use the installed update skill:

**Cursor:**

```text
/install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Cursor.
```

**Codex:**

```text
$geldmacher-efficiency:install-new-release-from-repo Update Efficiency to the latest stable GitHub Release for Codex.
```

If the skill is missing, use the installation request above. For manual updates, follow the [backup, replacement, and activation steps](docs/installation.md#manual-update). The [installation guide](docs/installation.md) also covers previews and recovery.

## Learn more

- [Usage and examples](docs/usage.md)
- [Installation, updates, and recovery](docs/installation.md)
- [Contributing and development](https://github.com/geldmacher/efficiency/blob/main/docs/development.md)
- [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/geldmacher/efficiency/issues)

[MIT](LICENSE) · Built by [Dennis Geldmacher](https://github.com/geldmacher)
