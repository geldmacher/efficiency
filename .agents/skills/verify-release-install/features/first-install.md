# First installation

Run `node .agents/skills/verify-release-install/scripts/verify.mjs` from the repository root after the planned installer and bundle changes are ready. The driver materializes the current Cursor and Codex bundles, creates matching local ZIP/checksum/provenance files, verifies and extracts the Cursor package into a temporary bootstrap directory, and invokes its packaged helper through Node.

Readiness requires the extracted helper and a successful `--help`. The drive uses `--host cursor --home <owned-home> --release-dir <owned-release> --dry-run` and then the same arguments without `--dry-run`. Exact paths are recorded in the transcript rather than supplied as placeholders during execution. Expect no home mutations from preview, an exact selected manifest version after installation, and `activation: unverified`.

The Codex drive uses a separate home and `--codex-bin` pointing to its controlled driver. Expect an unrelated marketplace entry and custom marketplace name to survive, native cache verification to pass, and the real user's plugin paths to remain outside the exercised paths. The human bootstrap prompt, initial checksum-tool availability and host skill routing are content walkthroughs, not actual agent execution evidence.
