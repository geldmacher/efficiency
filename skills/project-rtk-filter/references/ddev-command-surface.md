# DDEV Command Surface

Use this reference only for projects that run through DDEV. Inventory the actual project before choosing filters; DDEV installations and custom commands vary.

## Inventory

1. Run `ddev help` and inspect `.ddev/config.yaml`, `.ddev/commands/**`, `.ddev/docker-compose*.yaml`, project docs, CI workflows, and agent instructions.
2. Read each custom command header (`Description`, `Usage`, `Example`, `Flags`) and, when needed, its implementation to determine whether it is finite, mutating, interactive, or streaming.
3. Search observed RTK history for `fallback: ddev` and rank recurring commands by output volume and safety.
4. Prefer the documented outer command. Cover quoted and unquoted forms only when the project actually uses both.

## Classification Matrix

| Surface | Typical commands | Filter policy |
|---|---|---|
| Project inspection | `ddev describe`, `ddev list`, `ddev version`, `ddev aliases` | Filter when output is recurring and noisy; preserve service URLs, status, versions, and failures. |
| Custom finite gates | `ddev check`, tests, lint, audits, docs, evaluations | Filter by output shape; preserve failures, warnings, summaries, paths, and exit diagnostics. |
| Package managers | `ddev composer ...`, `ddev npm ...`, `ddev npx ...`, `ddev yarn ...`, project-specific pnpm wrappers | Match finite install/check/test/build forms precisely. Do not match dev servers or watchers. |
| Generic execution | `ddev exec ...` | Use a positive allowlist of known finite inner tools. Match the outer command and documented working-directory variants. |
| Database queries | `ddev mysql -e ...`, `ddev mysql --execute=...`, `ddev psql -c ...`, `ddev psql -f ...` | Match only explicit non-interactive execution/file modes. Preserve SQL errors. Prefer narrow queries and a SQL `LIMIT`. |
| Cache/data inspection | finite `redis-cli`, application console reads, status commands | Allowlist read-only or clearly bounded forms. Separate mutations such as flush/reset/load/import. |
| Logs | `ddev logs --tail=<n>`, commands with an explicit finite `--since`/line bound | Match only bounded, non-following forms. Preserve error context, timestamps when useful, and omission markers. |
| Lifecycle/configuration | `start`, `restart`, `stop`, `poweroff`, `config`, `delete`, add-on changes | Do not create filters merely for adoption metrics. Do not run these as filter smoke tests. |
| Import/export/snapshots | `import-db`, `import-files`, `export-db`, `snapshot`, restore/pull/push commands | Treat as stateful or potentially large. Add a narrowly scoped filter only from documented need; never smoke-test without explicit authorization. |
| Interactive/streaming | bare `mysql`, `psql`, `redis-cli`, `ssh`, `tui`, `logs -f`, shares/tunnels, dev servers, watchers | Exclude from filters. |
| Browser/UI launchers | `launch`, `mailpit`, `phpmyadmin`, `pgadmin` | Exclude; these are UI actions rather than useful LLM output streams. |

## Matching Rules

- Anchor at `^ddev\s+` and require a word boundary or `(?:\s|$)` after the subcommand.
- Account for DDEV global flags only when they appear in project usage; do not weaken every matcher preemptively.
- Keep generic `ddev exec` filters last and allowlist the inner executable or script family.
- Do not use a catch-all `^ddev\b` filter. It would include interactive, destructive, and streaming commands.
- For database clients, require finite mode in the matcher. A conservative MySQL/MariaDB shape is:

```toml
match_command = '^ddev\s+mysql\b.*(?:\s-e(?:\s|$)|\s--execute(?:=|\s))'
```

- Add separate matchers for other clients rather than combining incompatible flags. For PostgreSQL, limit matches to `-c`/`--command` or `-f`/`--file` forms used by the project.

## Output Policy

- Strip ANSI sequences, blank lines, stable startup banners, and proven package-manager boilerplate.
- Preserve `FAIL`, `ERROR`, `WARN`, exceptions, stack traces, file paths, test summaries, migration output, SQL diagnostics, and non-zero-exit context.
- Bound repetitive row output with conservative `head_lines`, `tail_lines`, and `max_lines`. Use `truncate_lines_at` only when very wide values are common and truncation is acceptable.
- Do not pretend generic filtering understands SQL result semantics. Recommend narrower columns, predicates, aggregation, and `LIMIT` when complete row sets are unnecessary.
- Set `on_empty` to a command-specific success or no-results message.

## Verification

1. Finish edits, review the filter, then establish trust from the project root with `rtk trust` when the user authorizes it.
2. Run `rtk verify --require-all`; a warning that project filters were skipped is a failed project-filter validation.
3. Use `RTK_TOML_DEBUG=1 rtk ddev <safe-finite-command>` for one representative command per new output shape.
4. Use `rtk hook check --agent cursor '<raw-command>'` separately. A project TOML match does not prove that the Cursor hook can rewrite the raw command.
5. Inspect `rtk gain --history` or `rtk gain --failures` and ensure the tested command is no longer recorded as an RTK parser fallback when the runtime path is expected to use the filter.
