---
name: rtk-filter-design
description: Design project-specific RTK filters that preserve useful diagnostics.
---

# RTK Filter Design

Before writing a user-facing result, read [the human communication contract](../efficiency/references/human-communication.md). State filter coverage, the risk of hidden diagnostics, and the next verification or trust action when useful.

Read [filter-format](references/filter-format.md). Also read [DDEV command surfaces](references/ddev-command-surface.md) when the project uses DDEV, databases, logs, package wrappers, or generic exec forms.

Inspect the project's documented and observed command surface. Prefer recurring finite checks, tests, lint, builds, documentation gates, generators, and bounded maintenance. Avoid filtering interactive, streaming, destructive, lifecycle, server, watcher, shell, or SSH operations because compacting them can hide state or change their usefulness.

Use precise matchers, conservative output limits, command-appropriate empty output, and fixtures that preserve failures, warnings, paths, summaries, and non-zero diagnostics. Keep protected data out of fixtures.

Use RTK verification and representative finite smoke checks when available. Treat trust warnings and unavailable verification as open evidence, explain the next safe action, and keep approvals inside RTK and the active host's native flow. Because trust is bound to the filter content, require the user to re-trust a changed filter before claiming host coverage.

In Cursor, RTK 0.44.0 or newer is required when the result depends on custom TOML filters inside the hook rewrite path. Use `rtk hook check --agent cursor '<finite-command>'`, then inspect `updated_input` and `permission`; keep an `ask` result approval-gated. In Codex, first inspect `rtk init --codex --show`, then run only an approved finite command through `rtk <command>` and confirm it with `rtk gain --history`. Codex has no Cursor `updated_input` receipt, so do not describe direct RTK execution as a hook rewrite.

In another Agent Plugins client, use only generic RTK verification plus that client's documented integration. If no documented host path exists, validate the filter with representative finite fixtures, mark host integration as unverified, and do not assume Cursor hook receipts or Codex instruction behavior.

Read [the auditor policy](references/auditor.md) when the user explicitly requests an independent filter audit. In Cursor, use the named `rtk-filter-auditor`. In Codex, delegate that bounded read-only policy and the human communication contract only after the explicit request and inherit the selected parent model. If delegation is unavailable, perform the audit in the current agent and label it as not independent.
