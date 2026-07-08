---
name: create-rtk-filter
description: Initiate creation or update of a project-specific RTK filter file, with special handling for DDEV command surfaces.
---

# Create RTK Filter

Use when a user wants project-specific RTK filters, especially for DDEV-backed project commands.

1. Follow the `project-rtk-filter` skill.
2. Inventory project-specific command surfaces before editing `.rtk/filters.toml`.
3. Prioritize documented finite commands that agents run often: checks, tests, lint, builds, evaluations, docs gates, generators, cache maintenance, and DDEV wrappers.
4. For DDEV projects, match the outer `ddev ...` command and include `ddev exec "cd <subdir> && ..."` variants when they are documented or clearly used by the project.
5. Exclude long-running dev servers, watchers, shells, interactive commands, and streaming log commands.
6. Create or update `.rtk/filters.toml` with conservative filters and inline tests.
7. Run `rtk verify` when available. If filters are untrusted, ask the user to run `rtk trust` and then retry verification.
8. Recommend `rtk-filter-reviewer` for an independent readonly review when filters cover many command groups or affect CI/debugging output.

The result should include a compact summary of command groups covered, commands excluded, verification results, and remaining RTK setup or trust requirements.
