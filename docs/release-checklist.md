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
- [ ] Confirm all five commands, five skills, and three agents are discoverable.
- [ ] Confirm all three auditors are read-only.

## Safe behavior

- [ ] `/setup-rtk` identifies RTK with `rtk gain` before offering setup.
- [ ] `/setup-rtk` shows the global Cursor dry-run and does not apply changes without an explicit request and required approval.
- [ ] `rtk hook check --agent cursor '<finite-command>'` reports the expected rewrite for a safe finite fixture.
- [ ] `/create-rtk-filter` excludes interactive, streaming, destructive, lifecycle, shell, and server commands.
- [ ] A temporary project filter preserves failures and passes `rtk verify --require-all` after the project is trusted.
- [ ] `/optimize-context` does not edit context on an analysis-only request.
- [ ] Auditor agents return analysis without modifying files.

## Documentation and release evidence

- [ ] README requirements and installation steps match the tested environment.
- [ ] Changelog and manifest version are consistent with the intended release.
- [ ] Record tested Cursor, RTK, Node.js, and platform versions in the release notes.
- [ ] Review the final diff for secrets, machine-specific paths, and unrelated files.
