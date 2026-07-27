---
name: rtk-filter-design
description: Design project-specific RTK filters that preserve useful diagnostics.
---

# RTK Filter Design

Read [filter-format](references/filter-format.md). Also read [DDEV command surfaces](references/ddev-command-surface.md) when the project uses DDEV, databases, logs, package wrappers, or generic exec forms.

Inspect the project's documented and observed command surface. Prefer recurring finite checks, tests, lint, builds, documentation gates, generators, and bounded maintenance. Avoid filtering interactive, streaming, destructive, lifecycle, server, watcher, shell, or SSH operations because compacting them can hide state or change their usefulness.

Use precise matchers, conservative output limits, command-appropriate empty output, and fixtures that preserve failures, warnings, paths, summaries, and non-zero diagnostics. Keep protected data out of fixtures.

Use RTK verification and representative finite smoke checks when available. RTK 0.44.0 or newer is required when the result depends on custom TOML filters being applied inside Cursor's hook rewrite path. Treat trust warnings and unavailable verification as open evidence, explain the next safe action, and keep any user approval inside RTK and Cursor's native flow. Because trust is bound to the filter content, require the user to re-trust a changed filter before claiming Cursor-hook coverage. Ask the optional rtk-filter-auditor for a second opinion when it would materially improve confidence.
