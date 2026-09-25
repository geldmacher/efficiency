# DDEV Command Surface

Before selecting a filter for a ddev command, read only the project sources that define that command, including `.ddev/config.yaml`, custom commands, and observed RTK fallbacks when they apply.

- Filter finite project gates, tests, quality checks, builds, docs, bounded maintenance, and documented package-manager commands.
- Match the outer `ddev ...` command. Generic `ddev exec` uses a positive allowlist of finite inner commands.
- Database clients require explicit finite modes: MySQL/MariaDB `-e` or `--execute`; PostgreSQL `-c`, `--command`, `-f`, or `--file`.
- Prefer SQL projection, predicates, aggregation, and `LIMIT` over aggressive row filtering.
- Logs require an explicit tail, time, or line bound and must not follow.
- Exclude lifecycle/configuration changes, import/export, tunnels, UI launchers, interactive clients, watchers, servers, shells, SSH, and streaming commands.
- Preserve service status, URLs, versions, warnings, SQL errors, stack traces, paths, timestamps when useful, summaries, and non-zero context.

After trust, use `RTK_TOML_DEBUG=1 rtk ddev <safe-finite-command>` for representative output shapes and inspect RTK history for unexpected fallback.
