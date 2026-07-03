---
name: cost-efficient-execution
description: Plan and execute Cursor work with targeted context, RTK-backed shell commands, and compact verification.
---

# Cost-Efficient Execution

## Goal

Complete the requested work with the least useful context and command output needed for correctness.

## Context Rules

- Start from likely entrypoints, manifests, tests, and named files before scanning the whole repository.
- Use `rg` or `rg --files` before slower or broader search tools.
- Prefer narrow file reads over dumping large files.
- Stop and ask when missing intent would cause expensive guessing.
- Do not hide execution-critical uncertainty in `Open questions`.

## Shell Rules

- Prefer RTK-backed commands whenever RTK is available.
- Use dry-runs for global setup, migrations, generation, publishing, and other broad changes when a dry-run exists.
- Keep command output focused on evidence needed for the next decision.
- Use `rtk gain` after meaningful shell-heavy work when token savings evidence is useful.

## Cost-Aware Packet

Produce this packet when planning work:

1. `Intent and success condition`
2. `Scope and non-goals`
3. `Context budget`
4. `Target files and symbols`
5. `RTK shell plan`
6. `Executable agent plan`
7. `Verification`
8. `Escalate instead of guessing when`
9. `Open questions`

## Step Quality

Each item in `Executable agent plan` must name:

- target files or symbols
- exact change
- context limit
- verification check
- escalation trigger

Keep the packet compact. Add detail only when it prevents wasted exploration or scope drift.
