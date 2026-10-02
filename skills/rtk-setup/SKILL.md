---
name: rtk-setup
description: Inspect, install, or update Rust Token Killer (RTK) from official stable releases; configure and verify its Cursor or Codex integration, including after updates. In the Efficiency source repo, reconcile affected skills and docs. For other clients, assess only documented integration.
---

# RTK Setup

Use this skill for RTK installation state and host integration. Use `rtk-filter-design` when the requested work concerns a command's output filter. An ordinary task that happens to execute `rtk` does not require integration inspection.

Before writing a user-facing result, read [the human communication contract](../efficiency/references/human-communication.md) once per task, unless it is already loaded. Report the verified RTK state and open integration checks.

Read [RTK evidence interpretation](../efficiency/references/rtk-evidence.md) before interpreting `rtk gain` or recommending RTK for efficiency. Report installation, host configuration, observed execution, estimated shell-output reduction, contributor concentration when material, and whole-task net effect as separate states. Whole-task savings remain `unverified` without comparable paired host and provider evidence.

Use RTK's installed command surface as the source of truth. Start with read-only identification in the active host's command environment: locate `rtk`, inspect `rtk --version`, and run `rtk gain`. A successful gain summary distinguishes Rust Token Killer from unrelated binaries with the same name. For installation/update requests or a plugin updater's companion check, follow [the shared lifecycle procedure](references/lifecycle.md). If absent, offer first installation; inspection or a plugin update alone does not authorize installing RTK. An external terminal's PATH or successful command does not establish the host's environment.

Identify the active host and read only its procedure: [Cursor](references/cursor.md) or [Codex](references/codex.md). Follow the installed version's supported path rather than assuming either the old instruction-only integration or the newest hook is available.

Before asking the user to trust a native hook, explain that it runs the local RTK program automatically, routes supported shell commands through RTK, and makes their output more compact. For an authorized Codex integration setup or update, follow the [hook metadata procedure](references/codex.md#hook-metadata-and-trust) to add a missing status message to the existing native hook. An inspection only reports missing metadata; it never adds it. Distinguish the execution status message from the title in Codex's trust dialog, whose display remains unverified until observed.

## After an RTK update

When asked to assess integration after an update, check the following within the requested scope:

1. Compare installed `rtk init --help` and `rtk hook --help`, official [RTK release notes](https://github.com/rtk-ai/rtk/releases), and the active integration. Consult current host documentation when hook support or approval semantics changed. Historical tested versions are evidence, not compatibility requirements.
2. Inspect configuration and preview the native setup with the host's dry-run. Add `-v` when supported to inspect replacement content. Identify stale or duplicate hooks/instructions and changes to defaults. Preserve unrelated configuration and user-owned tracking, environment, and sandbox settings. If `rtk init` would overwrite custom guidance in generated `RTK.md`, show that loss and propose retaining needed additions in user-owned configuration or instructions before replacement; do not silently discard them.
3. Exercise the host-specific hook processor when available, then a finite smoke through the actual host. After integration or plugin changes, reload/restart as required and use a fresh task before claiming activation. Confirm the executed command and native approval outcome as well as `rtk gain --history`; history alone cannot distinguish direct RTK execution from automatic rewriting. Check effective tracking paths and writable state in the host, not merely configured values. Shared history may contain other hosts' concurrent commands.
4. Assess output quality for material commands from the user's work. Where needed and authorized, compare representative filtered output with `rtk proxy <command>` for diagnostics, exact paths, truncation, exit status, and machine-consumed output. Use existing results when sufficient; do not start unrelated builds, benchmarks, or provider runs. Route an actual filter change to `rtk-filter-design`.

An inspection request authorizes no configuration change. Apply an already requested change only after previewing its concrete impact and satisfying the active host's filesystem and approval flow. Keep generated `RTK.md` owned by `rtk init`; do not hand-edit it as a durable fix. Do not add custom hook machinery when the native integration suffices.

For an internet update in the positively identified Efficiency source repo, follow [source reconciliation](references/source-maintenance.md), including when the installed version is already current. Completion requires both the binary/integration result and reconciliation of affected source instructions. In installed plugin packages or other repositories, report compatibility findings; never rewrite the installed skill bundle. External RTK updates are checked on the next relevant invocation, with no watcher or background check.

For another Agent Plugins client, keep host integration read-only and generic. Use `rtk --version` and `rtk gain`, then inspect only integration commands or configuration surfaces documented by that host and the installed RTK version. If no documented integration exists, report it as unavailable or unverified; do not run Cursor or Codex setup commands and do not edit host configuration.

For every host, do not use watchers, servers, interactive commands, streaming output, or destructive commands as verification fixtures. If the current environment cannot run a check, give the relevant next command and mark the result as unverified.

Report the verified installation/version, configuration, processor result, observed host execution/approval, tracking, and output-quality evidence. Mark unavailable checks as `unverified` with the next concrete check. Recommend the smallest evidence-supported adjustment; configuration or processor success alone does not establish an ideal live integration.
