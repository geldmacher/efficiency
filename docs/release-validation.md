# GitHub Release validation

The repository-local GitHub Release harness exposes one explicit no-argument journey. It is development tooling and is excluded from the Agent Plugins, Cursor, and Codex bundles.

Before tracked mutation, the harness proves reachable authenticated GitHub access, configured commit identity, the expected `geldmacher/efficiency` repository, a fresh `main` baseline, complete NUL-safe changed-path inventory, safe regular files, consistent declared versions, release-ready changelog notes, and a passing complete release gate. Symlinks, nested repositories, recognizable secrets, annotated tags, unsafe paths, unavailable services, and conflicting identities stop the run.

The harness may create at most one `Release v{version}` commit. It binds retry state before the commit boundary, validates any resumed commit against its parent, subject, tree, and release identity, and compares the final staged tree with `HEAD` before deciding whether a commit is necessary. It creates only a lightweight tag and updates `origin/main` plus that tag atomically. A mixed remote state stops without repair, deletion, reset, force-push, or clobbering.

Assets are built from a materialized Git snapshot through the existing deterministic target builder. The release contains exactly separate Cursor and Codex archives, `RELEASE_NOTES.md`, `provenance.json`, and `SHA256SUMS`; the portable Agent Plugins target is not published as a host archive. Archives use one `geldmacher-efficiency/` root, preserve canonical modes, and exclude development paths and secret material.

GitHub publication is non-overwriting. Existing metadata and asset names must match exactly, and every published asset is downloaded again and compared byte-for-byte before success is reported. Focused tests use controlled Git and GitHub substitutes and perform no live release.
