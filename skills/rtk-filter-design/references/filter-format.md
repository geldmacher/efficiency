# Project Filter Format

Use this minimal structure after inventorying the real command:

```toml
[filters.project_check]
description = "Compact project check output"
match_command = "^project-check(?:\\s|$)"
strip_ansi = true
filter_stderr = true
on_empty = "project check: ok"

[[tests.project_check]]
name = "keeps failures"
input = "ERROR tests/ExampleTest failed"
expected = "ERROR tests/ExampleTest failed"
```

Preserve failures, warnings, exceptions, assertions, stack traces, paths, summaries, request IDs, and non-zero diagnostics. Strip only proven noise. Keep enough head and tail context to diagnose failure. Every new output shape needs an inline diagnostic fixture.

Run `rtk verify --require-all`. Trust is a separate user-approved step after edits: run the native `rtk trust` flow from the intended project root, and re-trust whenever the filter content changes. Do not bypass that boundary with non-interactive trust unless the user explicitly requests it.

RTK 0.44.0 or newer wires trusted custom TOML filters into Cursor's hook rewrite path. Use `rtk hook check --agent cursor '<command>'` and inspect the resulting `updated_input` and `permission` when hook rewriting is in scope. `allow` and `ask` are both valid outcomes when they match Cursor's active policy; the latter must remain approval-gated. Filter execution or `rtk verify` alone does not prove Cursor-hook rewriting.
