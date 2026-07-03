# AGENTS.md

## Repository Purpose

This repository is a Cursor plugin for reducing avoidable Cursor cost. Keep it focused on RTK-backed shell usage, targeted context, bounded command output, lean validation, and efficiency review.

Do not turn this plugin into a workflow plugin. Do not add handoff compilation, implementation-role orchestration, delivery-review loops, or task execution packets. Those concerns belong in the workflow plugin or Cursor's native planning surfaces.

## README Boundary

Keep `README.md` user-facing. Put agent-facing operating instructions, validation rules, and maintenance guidance in this file or in the plugin component files under `commands/`, `skills/`, `agents/`, and `rules/`.

## RTK Setup Rules

`/setup-rtk` must follow this safety model:

1. Verify RTK is available with `rtk --version` and `command -v rtk`.
2. If RTK is missing, show the official RTK installation documentation and stop.
3. Run `rtk init --global --agent cursor --dry-run` first.
4. Summarize the dry-run result.
5. Ask for explicit confirmation before running `rtk init --global --agent cursor`.
6. After setup, instruct the user to restart Cursor and verify RTK-backed shell behavior.

Never install RTK, mutate global Cursor configuration, or apply RTK setup without explicit user confirmation.

## Cost Budget Format

`/cost-budget` produces a compact set of cost controls with these sections:

1. `Cost objective`
2. `RTK requirements`
3. `Context limits`
4. `Shell-output limits`
5. `Dry-run requirements`
6. `Validation budget`
7. `Stop and ask when`

Each item must be a cost-saving constraint or procedure, not an implementation step.

## Maintenance Rules

- Prefer RTK-backed shell commands when RTK is available.
- Use `rg` or `rg --files` before broad scans.
- Keep command output scoped to evidence needed for the next decision.
- Do not add custom Cursor hooks for RTK in v0.1; delegate integration to RTK's supported Cursor setup.
- Keep plugin manifest metadata aligned with `.cursor-plugin/plugin.json`.
- Keep command, skill, agent, and rule frontmatter valid.

## Validation

Before committing or publishing plugin changes, run:

```bash
node scripts/validate-plugin.mjs
```

The validator checks `.cursor-plugin/plugin.json`, the configured logo path, and required frontmatter for commands, skills, agents, and rules.
