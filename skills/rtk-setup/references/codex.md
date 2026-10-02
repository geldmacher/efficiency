# Codex RTK integration

Inspect with `rtk init --codex --show`. Before a requested global change, run `rtk init --global --codex --dry-run`; when supported, use `rtk -v init --global --codex --dry-run` to inspect replacement content. Summarize all affected files, including `AGENTS.md`, generated `RTK.md`, and `hooks.json` when the installed version supports hooks. Preserve user-owned tracking/environment/sandbox configuration and existing hooks.

RTK 0.44.2 was tested with instruction-based Codex integration. RTK 0.50.0 provides a native `PreToolUse` processor and setup path. Confirm the installed command surface and the active Codex app/core's support using the [official hook documentation](https://learn.chatgpt.com/docs/hooks); a separate CLI's version does not establish the desktop app's capabilities. Do not migrate merely because a newer path exists.

## Native hook path

### Processor and live execution

When supported, inspect registration, enabled/trusted hook state in Codex, and `rtk hook check --agent codex 'git status --short'`. Exercise `rtk hook codex` with this RTK 0.50.0 processor fixture on stdin:

```json
{"hook_event_name":"PreToolUse","permission_mode":"default","tool_name":"Bash","tool_input":{"command":"git status --short","timeout_ms":1000}}
```

The fixture does not execute the command. `hook_event_name`, the shell tool name, and a supported `permission_mode` matter: omitting `permission_mode` makes RTK 0.50.0 pass through without a rewrite. If the actual host sends a different payload, verify that payload against the installed processor rather than inventing compatibility.

Expect `hookSpecificOutput.hookEventName: PreToolUse`, `hookSpecificOutput.updatedInput.command: rtk git status --short`, and `hookSpecificOutput.permissionDecision: allow`, with other input fields retained. These are Codex fields, not Cursor's `updated_input` and `permission`. Protocol-level `allow` is required for Codex's replacement input; it does not prove that the rewritten command bypassed or satisfied native approvals and sandbox checks. Do not copy Cursor's `ask` response into Codex or interpret unsupported fields as an enforced approval gate.

For a valid, supported, policy-permitted fixture, missing replacement input remains failed or unverified. Unsupported inputs or policy-based passthrough are separate observations. A successful processor result proves only the processor. In a fresh actual Codex task, observe an unprefixed finite shell call, its replacement/executed command and native permission result. Do not relax permissions or bypass hook trust for the smoke. Then check `rtk gain --history`; it proves RTK execution, not automatic rewriting by itself.

### Hook metadata and trust

Before asking the user to trust the hook, explain in their language that `rtk hook codex` runs the local RTK program before shell calls and rewrites supported commands to use RTK's compact output. Codex requires trust for automatic hook execution. Metadata does not replace that trust review or establish approval of a rewritten command.

Before an authorized native init, retain any existing RTK status message with the configuration backup and account for its preservation in the preview. After an authorized native Codex integration setup or update, inspect the resulting `hooks.json` in the requested configuration scope. Identify the single command handler with `type: "command"` and `command: "rtk hook codex"` in the `PreToolUse` group with `matcher: "Bash"`. If native init removed a retained message, restore that message rather than replacing it with a default. Otherwise, if the handler has no `statusMessage` field, add one in the user's language: `RTK – Terminalausgaben komprimieren` in German or `RTK – Compact terminal output` in English. For an English setup without a pre-existing message, the resulting handler is:

```json
{
  "type": "command",
  "command": "rtk hook codex",
  "statusMessage": "RTK – Compact terminal output"
}
```

This is a handler example, not a replacement for the complete file. Show the exact metadata diff before writing, account for it in the setup preview, and apply it only within the already authorized integration scope and native filesystem approval flow. Preserve an identical or user-defined existing message, including one in another language. Preserve all other handlers, the command, matcher, timeout, additional fields, and user-owned tracking/environment/sandbox settings. If no unique matching handler exists, or the source uses a different representation or command, report the ambiguity and leave metadata unchanged; do not create a duplicate hook or normalize custom configuration.

Recheck the metadata after later authorized native setup or integration updates because native init may replace configuration. Inspection-only requests report a missing message without changing anything. Do not edit RTK-generated `RTK.md`, add a wrapper, or bypass hook trust. A changed hook definition may require renewed trust.

`statusMessage` describes the hook while it runs; it is not a documented hook name. During a separately commissioned local setup or live smoke, record the trust-dialog title and execution status display separately, with the Codex version and observed evidence. A dialog still titled "Hook 1" is compatible with successful metadata setup; mark any unobserved display as `unverified` and do not claim the title changed from configuration alone. A metadata-only source change does not authorize a personal configuration change, deployment, or extra model invocation.

## Instruction-based path

When native rewriting is unavailable or not configured, verify the active `AGENTS.md` reference and operational instructions. Run one approved finite command directly as `rtk <command>`, then inspect `rtk gain --history`. Report this as direct RTK execution and leave automatic rewriting unverified. In this path, setup examples or a Verification section apply to setup/troubleshooting, not every task.

For requested removal, preview `rtk init --global --codex --uninstall --dry-run`. Apply only the authorized removal and re-inspect the effective reference and hook state.
