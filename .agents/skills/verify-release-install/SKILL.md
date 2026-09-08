---
name: verify-release-install
description: Verify Efficiency release first installation, update, and failure rollback through the real packaged installer with isolated homes and local release fixtures. Use for scoped repository acceptance, without changing real host installations.
---

# Verify release installation

Read the [feature index](features/README.md), then the selected feature. Run from the Efficiency repository root with Node.js 22+, Git, and the existing development dependencies installed. This verifier and its test fixtures are repository-only.

Doctor: inspect `git status --short`, `node --version`, and the existence of the installer and `tests/helpers/release-install-fixture.mjs`. Confirm that the selected check is authorized. No real host login, network, provider invocation or desktop restart is needed.

Run `node .agents/skills/verify-release-install/scripts/verify.mjs` to exercise the complete feature map through the packaged helper. Prefix commands with RTK where required by the active harness. The driver builds actual targets, generates local release ZIPs through the repository's release format, and launches the helper from a different working directory. It uses two disposable home directories and a controlled Codex executable within its disposable home. It never overrides the real HOME or CODEX_HOME and never calls the real Codex installer.

The closing JSON report names the retained evidence directory. Inspect its `report.json` and CLI transcripts for passed or failed observations. The driver removes only its own fixture workspace, including after failure, and verifies that the report survives cleanup. A nonzero exit is failed verification; do not change the expected outcome to make it pass. Product corrections need the matching implementation scope.

The drive proves the packaged CLI, file changes, rollback, and controlled native-install boundary. It does not prove an agent chose the right skill, real GitHub availability, actual Codex cache behavior, Cursor local-import policy, live discovery, or compatibility on unexecuted operating systems. Retain those limits in the handoff and commission a separate review of the implementation and verifier.
