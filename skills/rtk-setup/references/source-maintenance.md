# Reconcile Efficiency source after RTK updates

Apply this procedure on every requested RTK internet update in the Efficiency development checkout, including a no-op because RTK is already current. The helper identifies the current working directory's Git root using the private development package identity, both Efficiency manifests, and build/test sources. A plugin name, installed cache path, or a skill's own location alone is insufficient. Installed packages and foreign repositories have no source reconciliation authority.

The RTK update request in this source context includes the affected instruction maintenance. Inspect the installed help and official release deltas from the previously documented version to the selected target. Compare current host documentation when the integration protocol changed. Evaluate the smallest affected surface:

- `rtk-setup` and `rtk-update` entrypoints, shared lifecycle/integration guidance, Cursor/Codex references and processor fixtures;
- `rtk-filter-design` command coverage, custom filter schema, trust and output fidelity;
- `efficiency/references/rtk-evidence.md` tracking and evidence interpretation;
- `install-new-release-from-repo` optional RTK inspection/offer and permission boundaries;
- dependent commands, usage/installation docs, runtime smokes, packaged assets and acceptance tests.

Correct evidence-backed contradictions and missing required paths; leave unaffected instructions alone. Distinguish native configuration, processor behavior, live host rewriting/approvals, output quality, and savings. Preserve custom/user-owned global settings. RTK-generated `RTK.md` stays owned by native init, with necessary local additions retained separately in user-owned instructions.

Run appropriate target/link/policy checks and changed helper tests. For lifecycle/updater changes, run the repository-only release-install verifier against actual packaged helpers and retain its report. Record each materially examined surface, what changed or why no change was needed, and any unverified host evidence. Do not declare the source reconciled if contradictions or required checks remain outstanding. Binary update, source reconciliation, local deployment, release publication and live activation are separate results; deploy or release only within the user's explicit scope.

In an installed release, report the RTK version and integration compatibility result, offer authorized setup, and leave shipped skill files unchanged. Source corrections are distributed through subsequent plugin releases. There is no watcher: an external RTK update is reassessed on the next `rtk-setup`, `rtk-update`, or plugin-update invocation.
