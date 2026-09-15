# Release checklist

Use the complete `npm run release-check` gate for manifest validation, discovery, host isolation, schema hashes, links, deterministic packages, instruction boundaries, and executable regression tests. Review its actual result and `git diff --check`; do not recheck these contracts manually.

## Release decisions

- [ ] Inspect the intended changes and choose the semantic version from their user-visible impact. Keep unrelated work outside the release assignment.
- [ ] Inspect retained release state before choosing a new version. Verify an older completed release against its downloaded assets and tags; resume an incomplete release at its existing version. Leave conflicting state untouched.
- [ ] Confirm Unreleased notes explain the shipped behavior and limitations. Preserve historical entries and receipts.
- [ ] Invoke the [repository release procedure](../.agents/skills/release-plugin/SKILL.md) explicitly. This authorizes its complete release workflow; installation, deployment and runtime evaluations remain separate assignments.
- [ ] Review the resulting commit, tag, asset hashes, provenance receipt and downloaded GitHub read-back. A failed or incomplete release is not success and is not repaired by overwriting remote assets.

See [release validation](release-validation.md) for the mechanism and its failure boundaries. The release script owns commits, lightweight tags, atomic pushes and publication; do not duplicate these operations manually.

## Checks matched to the change

- [ ] For installer or packaging changes, run `node .agents/skills/verify-release-install/scripts/verify.mjs`. Inspect its retained report and CLI transcripts after fixture cleanup. It executes the packaged CLI from a temporary extraction path and a different working directory, including platform path aliases such as macOS `/var` and `/private/var`. Assert expected output and resulting state, not exit code alone.
- [ ] For instruction changes, inspect representative matching and non-matching requests and verify that each remaining loading path supplies its necessary constraints. A content review or text assertion does not prove model behavior or human comprehension.
- [ ] Review the final changes for protected data, unexpected generated files, accidental public capability removal and obsolete references. Keep release receipts and recovery state outside cleanup.

Useful instruction cases include a single-purpose formatter versus a speculative registry, one transaction adapter that hides necessary recovery, an analysis-only request versus an authorized edit, and RTK compression versus a claim about whole-task cost. Keep expected decisions separate from a live evaluating agent's prompt.

## Runtime evidence, when commissioned

- [ ] Select the affected [Cursor](runtime-smoke.md), [Codex](codex-runtime-smoke.md) or [Agent Plugins](agent-plugins-runtime-smoke.md) procedure and agree on the client, model-call limit and cost ceiling before running it. Do not run all procedures automatically.
- [ ] Record the source commit, target hash, host/client versions, model, executed cases and observed results. Use isolated state and restore only changes made for that exercise.
- [ ] Distinguish source installation, native cache verification, fresh-task discovery and observed behavior. A restored source does not prove native cache rollback, and a passing repository gate does not prove live activation.
- [ ] For global response-guidance changes, inspect the active AGENTS file, review the exact marked-block diff, preserve unrelated content and obtain explicit approval. Verify a real change in a new task. The setup is an agent instruction workflow; repository tests do not execute its global edits.
- [ ] Report missing or unexecuted evidence explicitly, including untested clients/platforms, last-response binding where the bounded smoke does not exercise it, and unmeasured whole-task cost or comprehension effects.

A normal repository check creates no publication or host-activation claim. Keep repository, packaged CLI, native runtime and publication results separate in the release report.
