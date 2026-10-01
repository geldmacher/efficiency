---
name: verify-release-install
description: Verify Efficiency release installation, update, rollback, and optional RTK lifecycle through actual packaged helpers with isolated homes, release fixtures and tool doubles. Use for scoped repository acceptance without changing real host installations.
---

# Verify release installation

Read the [feature index](features/README.md), then the selected feature. Run from the Efficiency repository root with Node.js 22+, Git, and the existing development dependencies installed. This verifier and its test fixtures are repository-only.

Doctor: inspect `git status --short`, `node --version`, and the existence of the installer and `tests/helpers/release-install-fixture.mjs`. Confirm that the selected check is authorized. No real host login, network, provider invocation or desktop restart is needed.

When a lifecycle change depends on executable discovery, cover lookup and dispatch through owned PATH entries and real symlink/proxy fixtures; an injected resolver alone does not prove this boundary. For tools that dispatch by invocation name, assert the preserved invocation path separately from canonical ownership identity. Cover relevant first-installation prerequisites being absent as well as already configured update states. Observe prerequisite preparation and installation separately, retaining exact commands and resulting state within the existing isolation and evidence boundaries.

Run `node .agents/skills/verify-release-install/scripts/verify.mjs` to exercise the complete feature map through the packaged helper. Prefix commands with RTK where required by the active harness. The driver builds actual targets, generates local release ZIPs through the repository's release format, and launches the helper from a different working directory. It uses two disposable home directories and a controlled Codex executable within its disposable home. It never overrides the real HOME or CODEX_HOME and never calls the real Codex installer.

The closing JSON report names the retained evidence directory. Inspect its `report.json` and CLI transcripts for passed or failed observations. The driver removes only its own fixture workspace, including after failure, and verifies that the report survives cleanup. A nonzero exit is failed verification; do not change the expected outcome to make it pass. Product corrections need the matching implementation scope.

The RTK branch uses the packaged lifecycle CLI, a local stable-release metadata fixture, and executable RTK/Homebrew/Cargo doubles on a confined PATH. It checks absent/declined, accepted installation/update, current/newer/pinned/wrong binaries, package failure and resulting-version mismatch. The missing-tap case checks read-only inspection, Homebrew preference even with Cargo present, separate tap preparation and installation previews, and preparation failure. Cargo installation and update use an actual `cargo → rustup` symlink with invocation-name dispatch. No real package manager or RTK binary is reachable through that PATH. Plugin success must survive companion failure. Inspect the [RTK feature](features/rtk-companion.md) for expected observations.

The drive proves the packaged CLI, file changes, rollback, and controlled native-install boundary. It does not prove an agent chose the right skill, obeyed a real user's consent, real GitHub availability, actual Codex cache behavior, Cursor local-import policy, live discovery, or compatibility on unexecuted operating systems. Retain those limits in the handoff. Commission a separate review only when requested; otherwise recommend one for specific unresolved risks.
