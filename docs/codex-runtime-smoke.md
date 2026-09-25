# Live Codex smoke procedure

This procedure verifies Codex discovery and behavior that repository tests cannot prove. It does not install the plugin, modify a personal marketplace, or change global AGENTS guidance by itself.

## Preconditions and budget

- Use the intended release checkout and record its commit plus working-tree status.
- Record the Codex CLI/app version, RTK version, Node.js version, platform, selected model, and plugin manifest hash.
- Confirm the personal source directory, marketplace entry, and installed plugin state separately.
- Obtain an explicit maximum approved cost and a limit of at most three model invocations before starting.
- Restart Codex after installation or update and use a fresh Codex task.
- Do not alter the real global `AGENTS.md` or `AGENTS.override.md` during discovery testing.

For selection-focused maintenance, choose case IDs from the [shared German/English matrix](runtime-smoke.md#task-selection-cases). Each case starts a fresh task. The limit of at most three model invocations still applies, including a preceding turn for a restatement case; additional cases require a separately approved run and cost ceiling. Do not batch cases into a single conversation and report independent selection. Record all unexecuted cases as `not run`.

## Smoke 1: implicit Evidence-Guided Simplicity

In the fresh task:

1. Confirm that `efficiency`, `context-optimization`, `install-new-release-from-repo`, `rtk-filter-design`, `rtk-setup`, and `response-simplicity-setup` are discoverable.
2. Confirm that `.codex-plugin` contains only `plugin.json`, all six discovered skills come from the generated root `skills/`, and Cursor commands, Cursor agents, and Cursor rules are not presented as Codex plugin components.
   Confirm that the generated root `AGENTS.md` matches the packaged response reference. Its presence proves packaging only; it must not be reported as globally loaded without a configured reference and a fresh-task read trace.
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
3. Confirm that the setup selects a non-empty `AGENTS.override.md` before `AGENTS.md`, preserves existing content including an RTK import, and resolves the unique stable local source from `codex plugin list --json`. Verify the source identity, version, and response text against the installed package. A missing or stale source must be reported without guessing a cache path.
4. A preview presents a marked exact diff with an explicit read instruction and an absolute Markdown link to the stable source's root `AGENTS.md`, without writing. Actual installation, update, or removal requires approval of that exact patch; existing approval remains valid and an unchanged reference is a no-op.
5. If testing an independent audit, request it explicitly and confirm bounded read-only inherited delegation. Otherwise confirm that no subagent starts automatically.
6. Record exclusive restatement-only behavior as `unverified`. Testing it requires separate approval for an additional model invocation and is not part of this bounded smoke.

Any approved real global guidance change is a separate operation. After such a change, restart with another fresh task before claiming instruction activation.

## Reference lifecycle cases

Use the setup skill's actual [managed-reference contract](../adapters/codex/skills/response-simplicity-setup/SKILL.md) as the procedure. Inspect the current installed source and global configuration before driving a case. Do not create conflicts in a real global file just to obtain coverage, or replace native installation evidence with invented command output.

| Case | Starting state | Expected observation |
| --- | --- | --- |
| First installation | Neither marker exists; unrelated guidance such as an RTK import may exist. | Preview appends one reference block. After separately approved application, unrelated bytes remain intact. A missing global file is allowed. |
| Legacy migration | One ordered marker pair surrounds the exact canonical inline text, with or without its `Code changes` section. | Requested update previews replacing that body with the stable reference; no duplicate block. |
| No-op | One generated reference points to the verified stable source. | Status reports an intact reference; update writes nothing and asks for no new patch approval. |
| Stable update | An installed update retains the source path; the new task and source package match. | The existing reference remains unchanged and a fresh task reads the updated file. No reference to the previous version's cache is introduced. |
| Missing or mismatched target | Target absent, source identity/version/text differs, or native source is ambiguous. | Report the concrete missing or stale prerequisite. No alternate cache guessing, overwrites, or claim of activation. |
| Conflicting block | Unpaired/duplicate markers, user-modified body, or equivalent unmarked guidance. | Preserve the complete file and explain the conflict; do not silently normalize or replace it. |
| Global override | Non-empty `AGENTS.override.md` exists alongside `AGENTS.md`. | Use only the override; an empty override falls back to `AGENTS.md`. Preserve the inactive file. |
| Removal | Recognized reference or unchanged legacy block; target may already be missing. | Preview removes only the block. After approval, unrelated bytes remain intact. An absent block is a no-op; missing native inspection does not prevent removal of a recognized reference. |
| Concurrent edit | Global file changes after the proposed diff. | Re-read and present a fresh diff; do not overwrite the new content. |

Cases unavailable in the actual authorized state may be walked through using supplied text fixtures, but label them `content walkthrough`, not native setup execution. Mutation cases require a separately commissioned operation and budget; do not change real global guidance as part of repository verification. Keep native lifecycle acceptance incomplete until those cases have actually been exercised.

For a separately authorized activation check, start a new task outside the plugin source and ask a simple question without a skill mention. Observe the global reference and the read of the stable package's `AGENTS.md`; verify that the full Efficiency skill and unrelated references are not loaded for that simple request. Response style alone is insufficient. Record plugin-enabled state separately: the configured global reference persists independently until removed. If a setup exercise creates temporary resources, retain the text evidence and clean only those owned resources.

## Receipt

Record each result as `pass`, `fail`, `unverified`, or `not run`, with exact evidence. Keep these claims separate:

- repository validation;
- personal marketplace availability and plugin installation;
- Codex plugin discovery;
- RTK Codex-path behavior;
- global response-guidance activation;
- public publication.

A passing local smoke does not prove Marketplace publication, behavior in another Codex version, or compatibility beyond the recorded RTK version.
