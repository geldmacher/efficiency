# Shared RTK integration

Use this guidance from `rtk-setup` or `rtk-update` within the user's requested scope. An ordinary task that happens to execute `rtk` does not require integration inspection.

## Identification and host selection

Use RTK's installed command surface as the source of truth. Start with read-only identification in the active host's command environment: locate `rtk`, inspect `rtk --version`, and run `rtk gain` when RTK is present. A successful gain summary distinguishes Rust Token Killer from unrelated binaries with the same name. Reuse identification from the lifecycle inspection when available. An external terminal's PATH or successful command does not establish the host's environment.

Identify the active host and read only its procedure: [Cursor](cursor.md) or [Codex](codex.md). Follow the installed version's supported path rather than assuming either the old instruction-only integration or the newest hook is available. The selected host procedure owns native setup, removal, hook trust, metadata, and processor details.

For another Agent Plugins client, keep host integration read-only and generic. Inspect only integration commands or configuration surfaces documented by that host and the installed RTK version. If no documented integration exists, report it as unavailable or unverified; do not run Cursor or Codex setup commands and do not edit host configuration.

## Verification and authorized changes

When assessing integration, including after an RTK update, check the following within the requested scope:

1. Compare installed `rtk init --help` and `rtk hook --help`, official [RTK release notes](https://github.com/rtk-ai/rtk/releases), and the active integration. Consult current host documentation when hook support or approval semantics changed. Historical tested versions are evidence, not compatibility requirements.
2. Inspect configuration and preview native setup with the selected host's dry-run. Add `-v` when supported to inspect replacement content. Identify stale or duplicate hooks/instructions and changes to defaults. Preserve unrelated configuration and user-owned tracking, environment, and sandbox settings. If `rtk init` would overwrite custom guidance in generated `RTK.md`, show that loss and propose retaining needed additions in user-owned configuration or instructions before replacement; do not silently discard them. Back up affected existing files before native init and retain recovery paths.
3. Exercise the host-specific hook processor when available, then a finite smoke through the actual host within the authorized runtime/cost scope. After integration or plugin changes, reload/restart as required and use a fresh task before claiming activation. Confirm the executed command and native approval outcome as well as `rtk gain --history`; history alone cannot distinguish direct RTK execution from automatic rewriting. Check effective tracking paths and writable state in the host, not merely configured values. Shared history may contain other hosts' concurrent commands.
4. Assess output quality for material commands from the user's work. Where needed and authorized, compare representative filtered output with `rtk proxy <command>` for diagnostics, exact paths, truncation, exit status, and machine-consumed output. Use existing results when sufficient; do not start unrelated builds, benchmarks, or provider runs. Route an actual filter change to `rtk-filter-design`.

An inspection request authorizes no configuration change. Apply an already requested change only after previewing its concrete impact and satisfying the active host's filesystem and approval flow. Keep generated `RTK.md` owned by `rtk init`; do not hand-edit it as a durable fix. Do not add custom hook machinery when the native integration suffices. Never rewrite an installed plugin bundle. External RTK changes are checked on the next relevant invocation, with no watcher or background check.

For every host, do not use watchers, servers, interactive commands, streaming output, or destructive commands as verification fixtures. If the current environment cannot run a check, give the relevant next command and mark the result as unverified.

## Reporting and evidence

Read [RTK evidence interpretation](../../efficiency/references/rtk-evidence.md) before interpreting `rtk gain` or recommending RTK for efficiency. Report installation, host configuration, observed execution, estimated shell-output reduction, contributor concentration when material, and whole-task net effect as separate states. Whole-task savings remain `unverified` without comparable paired host and provider evidence.

Report the verified installation/version, configuration, processor result, observed host execution/approval, tracking, and output-quality evidence. Mark unavailable checks as `unverified` with the next concrete check. Recommend the smallest evidence-supported adjustment; configuration or processor success alone does not establish an ideal live integration.
