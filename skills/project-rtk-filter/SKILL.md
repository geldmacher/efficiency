---
name: project-rtk-filter
description: Create tested project RTK filters for local command surfaces and DDEV projects, including custom commands, exec/package-manager wrappers, bounded logs, and finite database queries while excluding lifecycle, destructive, streaming, and interactive operations.
---

# Project RTK Filter

## Goal

Create or update a project's `.rtk/filters.toml` so project-specific commands produce compact, useful output when RTK wraps shell execution.

Use this when the user asks for RTK filters, DDEV filtering, command-output compaction, or project-local RTK integration.

## Safety

- Do not install RTK, run global RTK setup, or mutate global Cursor config unless the user explicitly asks.
- Preserve existing filters and tests unless they are clearly wrong.
- Do not create filters for long-running dev servers, watchers, shells, SSH sessions, `tail -f`, or interactive commands.
- Prefer project-local `.rtk/filters.toml`; do not put project command knowledge into global RTK config by default.
- If a command handles secrets or production logs, filter noise only; never add examples that contain real secrets, tokens, prompts, or customer data.

## Command Inventory

Find commands that are specific to the current project before writing filters:

1. Read the project entrypoints and command docs, such as `AGENTS.md`, `README.md`, `docs/**`, `.github/workflows/**`, `.ddev/**`, `Makefile`, `package.json`, `composer.json`, `pyproject.toml`, `Taskfile.yml`, and scripts under `bin/` or `scripts/`.
2. Identify commands agents are expected to run often: checks, tests, linting, builds, evaluations, docs gates, generators, cache maintenance, and CLI wrappers.
3. When `.ddev/config.yaml` or `.ddev/commands/` exists, read [references/ddev-command-surface.md](references/ddev-command-surface.md) completely before designing filters. Inventory `ddev help`, every `.ddev/commands/{host,web,db,...}` entry, documented `ddev exec` forms, package-manager wrappers, bounded logs, and finite database-client invocations.
4. Inspect `rtk gain --failures` and `rtk gain --history` when available for frequently observed `rtk fallback: ddev ...` commands. Treat these as missed filter opportunities, not necessarily failed shell commands.
5. Separate finite commands from long-running, interactive, lifecycle, and destructive commands. Filter only finite commands; never smoke-test a mutating command merely to validate a filter.
6. Group commands by output shape, not by implementation technology. Example groups: project gates, tests/quality, docs/licensing, evaluations, maintenance, package managers, bounded logs, database queries, and allowlisted generic `ddev exec`.

## Filter Design

For each group:

- Use a precise `match_command` regex that catches documented command variants without catching unrelated commands.
- Enable `strip_ansi = true`.
- Set `filter_stderr = true` for tools that print useful diagnostics to stderr.
- Strip blank lines and known boilerplate only when failures and warnings remain visible.
- Keep enough head and tail output to diagnose failures.
- Add `on_empty` so a fully-filtered success is still understandable.
- Add at least one inline `[[tests.<filter-name>]]` fixture that proves important diagnostics survive filtering.

Use this minimal shape for new project filters, replacing the name, regex, examples, and success message with project-specific values:

```toml
[filters.project_check]
description = "Compact project check output"
match_command = "^ddev\\s+check\\b"
strip_ansi = true
filter_stderr = true
on_empty = "ddev check: ok"

[[tests.project_check]]
name = "keeps failures"
input = "ERROR tests/ExampleTest.php failed"
expected = "ERROR tests/ExampleTest.php failed"
```

Prefer conservative filters:

- Keep `FAIL`, `ERROR`, `WARN`, stack traces, assertion messages, file paths, command summaries, and non-zero-exit diagnostics.
- Avoid stripping broad words like `warning`, `failed`, `error`, `exception`, `request_id`, `trace`, or `deprecated` unless the project has a specific noisy line that is safe to remove.
- Do not collapse domain-specific evidence needed for debugging.
- Match the outer `ddev ...` invocation so direct `rtk ddev ...` execution can select the project filter.
- Use positive allowlists for broad wrappers such as `ddev exec`; do not match arbitrary container commands.
- Match database clients only in explicit finite modes such as MySQL/MariaDB `-e`/`--execute` or PostgreSQL `-c`/`--command` and `-f`/`--file`. Never match a bare interactive client.
- Prefer SQL-side projection, aggregation, predicates, and `LIMIT` over aggressive output filtering. Use line and width caps only as a safety bound, and preserve database errors.

## Verification

Use the cheapest available checks:

1. Validate TOML syntax and require inline coverage with `rtk verify --require-all` when available.
2. If `rtk verify --require-all` warns that project filters were skipped, such as `untrusted project filters skipped`, do not report project-filter validation as passed.
3. Finish filter edits before trust. If project-local filters require trust, tell the user to review the file and run `rtk trust` from the project root instead of doing it silently; edits change the trusted hash. Then rerun `rtk verify --require-all` and require the project test count to be included.
4. Smoke-test representative commands explicitly through RTK only when they are finite and safe, for example `RTK_TOML_DEBUG=1 rtk ddev <finite-command>`. Require debug output or savings history to show the intended project filter rather than `fallback`.
5. For DDEV commands, avoid starting duplicate dev servers. Prefer documented finite gates and small `ddev exec` smoke commands.
6. Check representative raw commands with `rtk hook check --agent cursor '<command>'` when Cursor integration is in scope. Report `No rewrite` as a hook/registry limitation: project TOML filters may still work for explicit `rtk ddev ...`, but the hook must not be claimed to auto-prefix that command.
7. Report any RTK-version limitation, such as a local version that can execute filters through `rtk <command>` but cannot rewrite TOML-only commands through the Cursor hook. Ensure project agent instructions explicitly prefer `rtk ddev ...` when the hook cannot rewrite the raw command.
8. Delegate to `rtk-filter-reviewer` only when changes cover at least three filter groups or introduce broadly matching generic regexes. Review smaller changes inline.

## Output

When planning, list:

- discovered project command groups
- filters to create or update
- commands intentionally excluded and why
- verification commands
- any `rtk trust` or version requirement the user must handle

When implementing, keep the diff limited to `.rtk/filters.toml` and directly related docs unless the user asks for broader setup.
