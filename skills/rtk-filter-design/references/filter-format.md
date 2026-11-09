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

Preserve failures, warnings, exceptions, assertions, stack traces, paths, summaries, request IDs, exit status, and non-zero diagnostics. Strip only proven noise. Keep enough head and tail context to diagnose failure. Every new output shape needs an inline diagnostic fixture.

Add representative fixtures for every required semantic property, including complete and exact paths, ordering when material, explicit truncation, and machine-consumed or piped output. A shorter output is insufficient evidence. If the filter cannot preserve the command's required native semantics, leave that command unfiltered or use the installed RTK version's documented raw bypass.

Run `rtk verify --require-all`. Trust is a separate user-approved step after edits: run the native `rtk trust` flow from the intended project root, and re-trust whenever the filter content changes. Do not bypass that boundary with non-interactive trust unless the user explicitly requests it.

The filter schema is unchanged (`schema_version = 1`). Project pipelines (`.rtk/pipeline.toml` and `.rtk/pipelines/*.toml`) also go through `rtk trust` and `rtk untrust`. Pipelines do not replace filters, and their hook rules apply to Claude Code only. From RTK 1.2.0, a user Claude pipeline `route` with `mode = "swap"` can run a command that has no RTK filter as `rtk <task> --question "…" -- sh -c '<command>'`. No built-in pipeline uses swap, so without that user rule the hook is unchanged. The swap stays off when `exclude_commands` names the program, including a path whose final component is that name (`git` matches `/usr/bin/git`). Excluding `curl` leaves `/usr/bin/curlie` eligible, and leaves `tools/curl/run.py` eligible because its final component is `run.py`. It also stays off for an `rtk` command, syntax the hook cannot check, a shell function or alias, an ask rule, `cd`, `pushd`, `popd`, and a task that cannot wrap the command.

Built-in command output, separate from the project schema: from RTK 1.2.0, bare `rtk ls` is held to what `ls` prints for the user's own arguments. A small listing that matches native `ls` is that never-worse result. Compact output remains when it is shorter, including long listings. `rtk git ls-tree --name-only` and `--name-status` fold consecutive paths by directory. `./` means no directory prefix. Quoted paths stay intact. Other `ls-tree` forms, and a foldable listing piped into `head`, `tail`, or `cat`, pass through. Rebuilding a folded path means prepending its directory. These shapes were read from the v1.2.0 source and were not executed here.

RTK 0.44.0 or newer wires trusted custom TOML filters into Cursor's hook rewrite path. Use `rtk hook check --agent cursor '<command>'` and inspect the resulting `updated_input` and `permission` when hook rewriting is in scope. `allow` and `ask` are both valid outcomes when they match Cursor's active policy; the latter must remain approval-gated. Filter execution or `rtk verify` alone does not prove Cursor-hook rewriting.
