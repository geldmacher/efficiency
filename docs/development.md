# Developing Efficiency

[Back to Efficiency](../README.md)

## Three deterministic targets

`npm run build:targets` creates three isolated bundles:

| Target | Output | Surface |
| --- | --- | --- |
| Agent Plugins v1 | `.build/plugins/agent-plugins/geldmacher-efficiency` | Root `plugin.json` and exactly five portable skills |
| Cursor | `.build/plugins/cursor/geldmacher-efficiency` | Cursor manifest, five skills, commands, agents, and rule |
| Codex | `.build/plugins/codex/geldmacher-efficiency` | Codex manifest, five portable skills, and the private setup skill |

Installable bundles contain only user documentation, required components and `assets/logo.svg`; development guides, runtime procedures, historical receipts and other artwork remain in this repository. The vendored Agent Plugins schema is included only in the portable target. npm is development tooling, not a supported distribution package.

The portable manifest targets the Agent Plugins 1.0.0 Working Draft pinned in the [vendored schema](../schemas/agent-plugins/1.0.0/plugin.schema.json). It has no MCP server, extensions, commands, agents, rules, or hooks. Native bundles intentionally omit root `plugin.json` so manifest selection stays unambiguous.

The Codex manifest uses the documented `./skills/` root and `.codex-plugin` contains only `plugin.json`. The Codex-only setup skill is maintained under `adapters/codex/skills` in the repository and projected into the generated Codex bundle as `skills/response-simplicity-setup`; it never enters the Agent Plugins or Cursor targets.

On Agent Plugins clients other than Cursor or Codex, the portable skills use conservative host-neutral behavior. They inspect only documented context or RTK integration surfaces, report unknown host integration as unverified, and do not assume Cursor hooks or Codex guidance paths.

## Develop or deploy from a Git checkout

Efficiency is not yet available in a public plugin store. Keep the Git checkout as the canonical source and deploy generated host copies from it. Do not clone into `~/.cursor/plugins/local` or `~/.codex/plugins`; those directories contain managed deployment copies and are atomically replaced.

### Requirements and clone

Install Git, Node.js 22 or newer, and npm. The selected host must also be installed: Cursor for a Cursor deployment, or the Codex CLI with plugin support for a Codex deployment.

```bash
mkdir -p ~/src/geldmacher-plugins
git clone https://github.com/geldmacher/efficiency.git ~/src/geldmacher-plugins/efficiency
cd ~/src/geldmacher-plugins/efficiency
npm ci
```

If you already have a checkout, use it instead and run `npm ci` from its repository root.

### Preview and install

Choose one host or deploy both:

| Target | Preview without changing host state | Install or update |
| --- | --- | --- |
| Cursor only | `npm run deploy:local -- --dry-run --cursor-only` | `npm run deploy:local -- --cursor-only` |
| Codex only | `npm run deploy:local -- --dry-run --codex-only` | `npm run deploy:local -- --codex-only` |
| Cursor and Codex | `npm run deploy:local -- --dry-run` | `npm run deploy:local` |

Append `--full` to an install command to run the complete repository `release-check` before deployment. Inspect the current installed state with `npm run deploy:status`; add `--cursor-only` or `--codex-only` to limit that check to one host.

The deploy command builds and validates all three deterministic bundles, then atomically replaces only the selected Cursor and Codex copies. There is no Agent Plugins deploy flag; `.build/plugins/agent-plugins/geldmacher-efficiency` is a conformance, package, and client-integration output.

- Cursor: `~/.cursor/plugins/local/geldmacher-efficiency`
- Codex source: `~/.codex/plugins/geldmacher-efficiency`

Every installed copy contains a `.local-deploy.json` receipt with its content-derived local version, Git revision, dirty status, source path, and deployment time. Dirty checkouts are allowed and explicitly recorded. For Codex, the command preserves the existing personal Marketplace name and unrelated entries; a new Marketplace is named `geldmacher-personal`. It checks the Marketplace root, installs with `codex plugin add geldmacher-efficiency@<marketplace-name> --json`, and verifies the complete cache against the selected source. Conflicting sources stop the deployment. Do not delete Codex caches manually.

After installation or an update, reload Cursor before testing its plugin surface and start a new Codex task before testing Codex discovery. The deploy command does not restart either host. See the [Cursor plugin documentation](https://cursor.com/docs/plugins) and OpenAI's [local plugin documentation](https://developers.openai.com/plugins/build/plugins).

### Migrating legacy source links

Local deployment supports migrating an existing source symlink to a physical copy. Check the old plugin's identity and Codex source/Marketplace conflicts, then treat the linked source as requiring migration. Do not recursively validate the linked checkout as an installation package: development files and linked or missing dependencies may be present. Fully validate the new generated copy and installed cache. This migration behavior belongs to local deployment; release installation continues to reject symlink destinations.

Replace only the managed link entries. Preserve the linked checkout and dependency targets; on deployment failure, restore the original links. When changing shared validation, retain the [local CLI coverage](../tests/local-plugin-deploy-cli.test.mjs) for preview, migration, rollback and unchanged link targets, and the [installation-state checks](../tests/codex-installation-state.test.mjs) for identity and source conflicts.

### Update from the origin repository

First protect any local work, then fast-forward the checkout and redeploy:

```bash
cd ~/src/geldmacher-plugins/efficiency
git status --short
git fetch origin
git pull --ff-only
npm ci
npm run deploy:local -- --dry-run
npm run deploy:local
npm run deploy:status
```

Inspect a dirty status before pulling; commit or stash intentional local changes rather than discarding them. `git pull --ff-only` refuses a divergent history instead of creating an implicit merge. `npm ci` synchronizes dependencies with the updated lockfile. The last three commands above update both hosts; use the matching `--cursor-only` or `--codex-only` flag when only one host is installed. A failed native operation leaves cache recovery explicitly unverified even when the previous source was restored. Inspect the error report before retrying. An unchanged bundle with a matching native cache is a verified no-op; changed content receives a new host-specific local version and replaces the previous copy transactionally.

## Development and verification

```bash
npm ci
npm run release-check
git diff --check
```

The release check validates all three manifests and target bundles, Agent Skills discovery and frontmatter, path containment, version alignment, links, and policy contracts. Source links exclude ignored `.build` output, while every newly generated target is checked directly for bundle-local links. It proves repository format and bundle state—not installation, live host behavior, broad client compatibility, Marketplace state, or publication. The bounded Cursor smoke can check a supplied baseline restatement without an extra model call, but it leaves binding to the immediately preceding assistant response unverified unless that call is separately approved. The three-invocation Codex smoke separates implicit simplicity selection, RTK setup, and optional response-guidance evidence; exclusive restatement-only behavior still requires a separately approved additional call.

Before a release, complete the [release checklist](release-checklist.md). Runtime checks remain separate: [Agent Plugins runtime smoke](agent-plugins-runtime-smoke.md), [Cursor runtime smoke](runtime-smoke.md), and [Codex runtime smoke](codex-runtime-smoke.md).

Repository maintainers may explicitly invoke `$release-plugin` in Codex or `/release-plugin` in Cursor. That single no-argument journey selects a semantic version from the actual changes, prepares consistent manifests and package metadata, runs the complete gate, may create one bounded release commit, creates a lightweight version tag, atomically pushes `main` and the tag, publishes only the Cursor and Codex archives, and verifies downloaded bytes. It reuses a suitable prepared version and resumes an exact incomplete release without bumping again. It never deploys or installs the plugin, restarts a host, overwrites an existing release, or repairs mixed remote state.

### CLI and build regression boundaries

When a test launches another Node test runner, clear inherited `NODE_TEST_CONTEXT` and keep warnings visible: a nested run can otherwise be skipped with exit code 0. Retain the [CLI test's execution sentinel](../tests/local-plugin-deploy-cli.test.mjs), which runs an intentionally failing test in the same subprocess environment and checks both its error text and failure status. Exercise `--full` outside the test suite so its release check does not recursively invoke that suite.

Before a builder deletes or writes output, compare canonical paths against both its repository and any supplied snapshot source. Reject output at, inside, or above either source; only the builder repository's managed `.build/plugins` is exempt. A checkout under the temporary directory needs the same protection as any other checkout. Retain [source-boundary coverage](../tests/plugin-targets.test.mjs) for unchanged files and directories after rejection, path aliases, and successful builds into separate temporary output.
