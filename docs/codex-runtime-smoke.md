# Live Codex smoke procedure

This procedure verifies Codex discovery and behavior that repository tests cannot prove. It does not install the plugin, modify a personal marketplace, or change global AGENTS guidance by itself.

## Preconditions and budget

- Use the intended release checkout and record its commit plus working-tree status.
- Record the Codex CLI/app version, RTK version, Node.js version, platform, selected model, and plugin manifest hash.
- Confirm the personal symlink, marketplace entry, and installed plugin state separately.
- Obtain an explicit maximum approved cost and a limit of at most three model invocations before starting.
- Restart Codex after installation or update and use a fresh Codex task.
- Do not alter the real global `AGENTS.md` or `AGENTS.override.md` during discovery testing.

## Smoke 1: implicit Evidence-Guided Simplicity

In the fresh task:

1. Confirm that `efficiency`, `context-optimization`, `rtk-filter-design`, `rtk-setup`, and `response-simplicity-setup` are discoverable.
2. Confirm that `.codex-plugin` contains only `plugin.json`, all five discovered skills come from the generated root `skills/`, and Cursor commands, Cursor agents, and Cursor rules are not presented as Codex plugin components.
3. Submit this natural request without explicitly invoking `$efficiency`: "Review this proposed refactor: add a generic strategy registry so one existing formatter can support possible future formats. Recommend the first sufficient safe approach justified by current requirements and repository evidence. Preserve public behavior, security, accessibility, and necessary validation. Explain the simplicity choice only if it changes the solution or risk."
4. Confirm implicit selection when Codex exposes it, the first evidence-supported sufficient choice, preserved constraints, and no unnecessary principle narration.

## Smoke 2: RTK host selection

1. Invoke `$rtk-setup` with a read-only inspection request.
2. Confirm that it uses `rtk init --codex --show`, identifies the installed RTK binary, and does not promise `updated_input`, `permission`, or Cursor hook-processor evidence.
3. If a finite direct RTK command is within the approved scope, run exactly one and verify it with `rtk gain --history`. Treat the history entry as execution evidence and the gain figure as scoped estimated shell-output reduction; keep provider tokens or cost, agent turns, result quality, and whole-task net effect unverified without a comparable paired run.

## Smoke 3: optional guidance and review boundary

Use the third invocation only if needed:

Because this invocation also requests setup status, it tests selection and fidelity of the restatement segment, not exclusive restatement-only behavior.

1. Ask `$response-simplicity-setup` for status or a preview only and explicitly request a shorter plain-language restatement of the immediately preceding Smoke 2 response before the status.
2. Confirm that the restatement segment preserves material facts, evidence, risks, and open gaps without adding analysis or claims within that segment. Treat the separately requested status as distinct output.
3. Confirm that the setup selects a non-empty `AGENTS.override.md` before `AGENTS.md`, preserves existing content including an RTK import, and presents a marked exact diff without writing.
4. Confirm that install, update, or removal stops for explicit approval.
5. If testing an independent audit, request it explicitly and confirm bounded read-only inherited delegation. Otherwise confirm that no subagent starts automatically.
6. Record exclusive restatement-only behavior as `unverified`. Testing it requires separate approval for an additional model invocation and is not part of this bounded smoke.

Any approved real global guidance change is a separate operation. After such a change, restart with another fresh task before claiming instruction activation.

## Receipt

Record each result as `pass`, `fail`, `unverified`, or `not run`, with exact evidence. Keep these claims separate:

- repository validation;
- personal marketplace availability and plugin installation;
- Codex plugin discovery;
- RTK Codex-path behavior;
- global response-guidance activation;
- public publication.

A passing local smoke does not prove Marketplace publication, behavior in another Codex version, or compatibility beyond the recorded RTK version.
