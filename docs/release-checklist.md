# Cursor release checklist

Complete this checklist before tagging a plugin release. Use a clean checkout or local plugin link and record any skipped item with a reason.

## Automated gates

- [ ] `npm ci`
- [ ] `npm run release-check`
- [ ] `git diff --check`
- [ ] The working tree contains no unexpected generated changes after the gates.

## Repository integrity

- [ ] `.cursor-plugin/plugin.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, and `package-lock.json` are present.
- [ ] Manifest and package versions agree.
- [ ] Manifest component paths resolve inside the plugin root.
- [ ] All command, skill, and agent names match their filenames or skill directories.
- [ ] Documentation links resolve and describe the current component set.

## Cursor discovery

- [ ] Install or link the repository at `~/.cursor/plugins/local/geldmacher-efficiency`.
- [ ] Run `Developer: Reload Window` or restart Cursor.
- [ ] Confirm the Efficiency plugin is visible in Cursor settings.
- [ ] Confirm all five commands, five skills, three agents, and the `response-simplicity` rule are discoverable.
- [ ] Confirm all three auditors are read-only.
- [ ] Confirm `response-simplicity` is shown as always applied and affects a fresh Cursor conversation. If it is downgraded or omitted, record the Cursor version and block the runtime-activation claim.

## Safe behavior

- [ ] `rtk --version` reports RTK 0.44.0 or newer for native Cursor hook and custom TOML filter coverage.
- [ ] `/setup-rtk` identifies RTK with `rtk gain` before offering setup.
- [ ] `/setup-rtk` shows the global Cursor dry-run and does not apply changes without an explicit request and required approval.
- [ ] `rtk hook check --agent cursor '<finite-command>'` reports the expected rewrite for a safe finite fixture.
- [ ] The real Cursor hook returns the RTK rewrite in `updated_input` for both a policy-allowed fixture and an approval-required fixture.
- [ ] The `allow` fixture executes through Cursor and appears as an RTK command in `rtk gain --history`.
- [ ] The `ask` fixture requests Cursor approval, retains the RTK rewrite, and does not execute before approval.
- [ ] `/create-rtk-filter` excludes interactive, streaming, destructive, lifecycle, shell, and server commands.
- [ ] A temporary project filter preserves failures and passes `rtk verify --require-all` after the project is trusted; editing it invalidates trust until the native `rtk trust` flow is completed again.
- [ ] `/optimize-context` does not edit context on an analysis-only request.
- [ ] The response rule leads with the outcome and removes filler without dropping evidence, uncertainty, risks, approvals, validation status, or exact technical content.
- [ ] Auditor agents return analysis without modifying files.

## Documentation and release evidence

- [ ] README requirements and installation steps match the tested environment.
- [ ] Changelog and manifest version are consistent with the intended release.
- [ ] Record tested Cursor, RTK, Node.js, and platform versions in the release notes.
- [ ] Review the final diff for secrets, machine-specific paths, and unrelated files.
