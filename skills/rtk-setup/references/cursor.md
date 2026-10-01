# Cursor RTK integration

Inspect with `rtk init --show --agent cursor`. RTK may also print Claude-related status; only Cursor's registration and effective Cursor settings establish Cursor configuration. Before a requested global change, run `rtk init --global --agent cursor --dry-run` and summarize every affected file or setting, including files outside Cursor's directory.

Use `rtk hook check --agent cursor 'git status --short'` before the finite smoke. When the installed version provides `rtk hook cursor`, exercise it with this JSON on stdin; this tests the processor without executing the command:

```json
{"tool_name":"Shell","tool_input":{"command":"git status --short"}}
```

A supported rewrite must retain `rtk git status --short` in `updated_input.command`. `permission: allow` and `permission: ask` are distinct outcomes. An `ask` response is a proposed native approval path, not proof that Cursor waited for approval. Do not execute it before required native approval. Empty output or a missing rewrite for a valid payload and supported, policy-permitted command remains failed or unverified; inspect the active policy before diagnosing a rewrite bug.

Run the real smoke through Cursor and inspect the executed command plus its approval/result, then use `rtk gain --history` to confirm RTK execution. If Cursor requests approval, retain its native flow. Headless non-execution of an `ask` result is expected until approval is available. If an existing allowlist accepts the command immediately, record that path and leave blocked-until-approval behavior unverified; do not change policy to manufacture a prompt.

When post-update verification concerns custom TOML filters, RTK 0.44.0 was the historical baseline for their Cursor rewrite path; confirm current support and filter trust separately. Successful filter execution alone does not prove hook coverage.

For requested removal, preview `rtk init --global --agent cursor --uninstall --dry-run`. Apply only the authorized removal and re-inspect Cursor registration.
