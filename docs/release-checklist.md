# Cursor release checklist

Complete this checklist before tagging a plugin release. Use a clean checkout or local plugin link and record every skipped item with a reason.

## Automated gates

- [ ] `npm ci`
- [ ] `npm run release-check`
- [ ] `git diff --check`
- [ ] The working tree contains no unexpected generated changes after the gates.

## Repository integrity

- [ ] Manifest, package, lockfile, changelog, and intended release versions agree.
- [ ] Declared component paths or globs resolve inside the plugin root and match at least one component.
- [ ] The plugin contains exactly four commands, four skills, two agents, and one rule.
- [ ] Component names and frontmatter match their files or skill directories.
- [ ] `schemas/plugin.schema.json` matches the source commit and SHA-256 in `schemas/README.md` byte-for-byte.
- [ ] Documentation links resolve and the 1.x migration table covers every removed entry point.

## Cursor discovery

- [ ] Install or link the repository at `~/.cursor/plugins/local/geldmacher-efficiency`.
- [ ] Run `Developer: Reload Window` or restart Cursor.
- [ ] Confirm the Efficiency plugin is visible in Cursor settings.
- [ ] Confirm all four commands, four skills, two agents, and the `response-simplicity` rule are discoverable.
- [ ] Confirm both auditors are read-only.
- [ ] Confirm `response-simplicity` is always applied and affects a fresh Cursor conversation.

## Safe behavior

- [ ] `/setup-rtk` identifies RTK with `rtk --version` and `rtk gain` before offering setup.
- [ ] `/setup-rtk` previews global changes and does not apply them without explicit intent and required approval.
- [ ] A safe finite command follows the real Cursor `allow` path and appears in `rtk gain --history`.
- [ ] A safe finite command follows the real Cursor `ask` path, retains the RTK rewrite, and does not run before approval.
- [ ] `/create-rtk-filter` excludes interactive, streaming, destructive, lifecycle, shell, and server commands.
- [ ] A temporary project filter preserves failures and passes `rtk verify --require-all`; edits invalidate trust until the native `rtk trust` flow is completed again.
- [ ] `/efficiency` handles before-work, in-progress, and after-work requests, identifies only concrete low-value output with a missing material benefit and practical adjustment, and does not replace project requirements or native controls.
- [ ] `/optimize-context` does not edit context on an analysis-only request.
- [ ] Auditor agents return analysis without modifying files; output-utility findings do not rely only on length, tone, or whether language appears AI-written.

## Runtime receipt and release evidence

- [ ] Complete [the live Cursor smoke](runtime-smoke.md) within its approved model-call and cost limits.
- [ ] Record Cursor, RTK, Node.js, platform, model, invocation count, baseline commit, runtime hashes, and observed results.
- [ ] Restore the plugin to its enabled state after baseline testing.
- [ ] Review the final diff for secrets, machine-specific paths, unrelated files, and uncommitted runtime artifacts.
- [ ] Do not claim runtime readiness when discovery, rule activation, or a required permission path remains unverified.
