# Efficiency

**Less noise. Less over-engineering. The right rigor where it matters.**

Efficiency is a lightweight plugin for Agent Plugins v1 clients, Cursor, and Codex that makes agent work leaner without making it careless:

- match effort and validation to the actual risk,
- select direct evidence and proportionate automation for the work,
- simplify designs and changed code without changing behavior or increasing reader load,
- reduce recurring context and instruction bloat,
- use RTK and project filters safely, and
- keep responses direct, understandable, and actionable without losing important evidence.

RTK (Rust Token Killer) is optional; it trims noisy terminal output before it reaches the model. Efficiency treats RTK gain figures as estimated shell-output reduction, not as proof of fewer provider-billed tokens, lower cost, or fewer agent turns. Efficiency adds no custom MCP server, telemetry, or background automation.

Across its four portable workflows, Efficiency starts with the outcome, translates non-obvious technical consequences into practical meaning, and names the next useful action when one exists. The guidance is written for mixed technical knowledge, preserves exact technical text, and does not force every answer into one template.

## What you get

| Goal | Agent Plugins v1 | Cursor | Codex |
| --- | --- | --- | --- |
| Right-size work and validation | `efficiency` skill | `/efficiency` | `$efficiency` |
| Challenge design and code simplicity | `efficiency` skill | `/efficiency` | `$efficiency` |
| Reduce recurring context | `context-optimization` skill | `/context-optimization` | `$context-optimization` |
| Inspect or prepare RTK | `rtk-setup` skill | `/rtk-setup` | `$rtk-setup` |
| Design a safe RTK filter | `rtk-filter-design` skill | `/rtk-filter-design` | `$rtk-filter-design` |
| Keep responses concise | Not in the portable core | Automatic `response-simplicity` rule | Optional `$response-simplicity-setup` |

Cursor also includes the optional read-only `efficiency-auditor` and `rtk-filter-auditor`. Codex can run the same checks through an inherited subagent when you explicitly request a second pass.

The Agent Plugins target contains four portable skills: `efficiency`, `context-optimization`, `rtk-filter-design`, and `rtk-setup`. Cursor exposes those four workflows as skills and slash commands. Codex discovers five skills: the same four portable skills plus its native `response-simplicity-setup` adapter.

## Three deterministic targets

`npm run build:targets` creates three isolated bundles:

| Target | Output | Surface |
| --- | --- | --- |
| Agent Plugins v1 | `.build/plugins/agent-plugins/geldmacher-efficiency` | Root `plugin.json` and exactly four portable skills |
| Cursor | `.build/plugins/cursor/geldmacher-efficiency` | Cursor manifest, four skills, commands, agents, and rule |
| Codex | `.build/plugins/codex/geldmacher-efficiency` | Codex manifest, four portable skills, and the private setup skill |

The portable manifest targets the Agent Plugins 1.0.0 Working Draft pinned in the [vendored schema](schemas/agent-plugins/1.0.0/plugin.schema.json). It has no MCP server, extensions, commands, agents, rules, or hooks. Native bundles intentionally omit root `plugin.json` so manifest selection stays unambiguous.

The Codex manifest uses the documented `./skills/` root and `.codex-plugin` contains only `plugin.json`. The Codex-only setup skill is maintained under `adapters/codex/skills` in the repository and projected into the generated Codex bundle as `skills/response-simplicity-setup`; it never enters the Agent Plugins or Cursor targets.

On Agent Plugins clients other than Cursor or Codex, the portable skills use conservative host-neutral behavior. They inspect only documented context or RTK integration surfaces, report unknown host integration as unverified, and do not assume Cursor hooks or Codex guidance paths.

## Install locally

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

Every installed copy contains a `.local-deploy.json` receipt with its content-derived local version, Git revision, dirty status, source path, and deployment time. Dirty checkouts are allowed and explicitly recorded. For Codex, the command also creates or updates only this plugin's entry in the `personal` Marketplace and refreshes the verified Codex cache with `codex plugin add geldmacher-efficiency@personal --json`. Do not delete Codex caches manually.

After installation or an update, reload Cursor before testing its plugin surface and start a new Codex task before testing Codex discovery. Review changed hooks manually before granting trust. The deploy command does not restart either host or grant hook trust. See the [Cursor plugin documentation](https://cursor.com/docs/plugins) and OpenAI's [local plugin documentation](https://developers.openai.com/plugins/build/plugins).

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

Inspect a dirty status before pulling; commit or stash intentional local changes rather than discarding them. `git pull --ff-only` refuses a divergent history instead of creating an implicit merge. `npm ci` synchronizes dependencies with the updated lockfile. The last three commands above update both hosts; use the matching `--cursor-only` or `--codex-only` flag when only one host is installed. An unchanged bundle is a verified no-op; changed content receives a new host-specific local version and replaces the previous copy transactionally.

## Use it

Ask for the outcome you want; Efficiency infers whether you are planning, adjusting, or reviewing work.

```text
/efficiency Keep this small refactor proportional and verify the risky paths.
/efficiency Identify at most two risk-bearing facts and the cheapest adequate direct evidence.
/efficiency Decide whether these repeated edits justify a safely rerunnable tool.
/efficiency Challenge this design once for simplicity before implementation.
/efficiency Review the current changes for code simplicity and reader load.
/efficiency Review whether this bug investigation has a tight, proportionate feedback loop.
/efficiency Draft a verifiable pull request summary and identify open validation gaps.
/context-optimization Find recurring instructions that can be consolidated.
/context-optimization Reduce these agent instructions without weakening their trigger coverage.
/rtk-setup Inspect my RTK setup without changing it.
```

Use the matching `$efficiency`, `$context-optimization`, or `$rtk-setup` skill in Codex.

Design reviews use the supplied proposal as their scope. Without an explicit path, code review covers the current Git change set. If none exists, Efficiency asks for a focused scope instead of reviewing the entire repository.

For proposed or completed work, Efficiency can identify at most two risk-bearing facts and select the cheapest adequate direct evidence while keeping source, derived, executed, and live evidence distinct. For repeated mechanical work, it compares direct edits with the full cost and verification value of a deterministic, safely rerunnable tool; identical transformations favor one tool over repeated manual delegation only when that tool clearly repays its cost. These branches recommend an approach but do not authorize tests or checks, scripts or tools, file changes, persisted artifacts, delegation, servers, deployment, live access, or scope expansion.

For debugging or performance work, Efficiency can assess whether the investigation has a focused, fast, deterministic feedback loop. It recommends the next proportionate step but does not start diagnosis, instrumentation, tests, fixes, delegation, or artifact creation without separate authorization. Context optimization can also review agent-consumed documents, keeping universal instructions available while moving branch-specific material behind precise conditional references.

For responses, Efficiency first considers whether the reader must act, decide, or understand, then keeps project terms exact, conditions before actions, and the common path before exceptions. If asked to restate the last response more simply, it rewrites only that response and preserves material facts, evidence, risks, and open gaps without adding new analysis or claims. For commit messages, pull request descriptions, release notes, and change summaries, the workflow follows project conventions first and distinguishes verified behavior, intended behavior, and open work; material claims should trace to the diff, a check, other evidence, or a labelled assumption. This guidance does not add a `bro` or technical-writing skill, extend the workflow to READMEs or RFCs, or prove that a change works.

## Designed to stay useful—not reckless

- Skills are opt-in. Only Cursor loads the short response rule automatically.
- Review requests never edit code. Simplification requires an explicit scoped change request.
- RTK setup, filter trust, and global guidance changes are previewed before approval.
- Auditors are read-only; independent model work happens only when requested.
- Specialized verification, repeatable-work, design, debugging, and agent-document guidance loads only for the matching workflow branch.
- Concision never removes material evidence, uncertainty, risks, blockers, approvals, or validation status. Efficiency does not replace correctness, security review, project requirements, or host approvals.
- The communication guidance supports quick understanding and action, but repository checks cannot prove live activation or actual human comprehension.
- **AI-Slop** means low-value generated output here. The plugin judges observable utility, not whether content looks AI-written.

Design and code simplification preserve observable behavior, public interfaces, persisted formats, security, performance, and project conventions unless you authorize otherwise. The workflow challenges the current design once, considers trace depth, hidden or mutable state, removable complexity, and whether code can express a claimed comment constraint, then recommends a smaller alternative only when it is materially better. It can conclude that the existing design is already proportionate.

RTK reporting keeps four evidence classes separate: whether RTK actually executed, the estimated shell-output reduction within the stated scope, which commands contribute most in absolute terms, and the whole-task net effect. The last remains unverified without a comparable paired run for the same task, host, model, effort, and environment that also observes provider tokens or cost, agent turns, and result quality. Filters are recommended only when complete exact paths, material ordering, visible truncation, exit status, warnings, and machine-consumed or piped output remain semantically equivalent to the native command.

## Requirements

| Component | Requirement |
| --- | --- |
| Cursor | Local plugin support enabled |
| Codex | Plugin support enabled |
| RTK | Optional; 0.44.0 for the verified Cursor hook baseline, 0.44.2 for the verified Codex command baseline |
| Development | Node.js 22 or newer |
| Platform | macOS, Linux, or WSL for the documented RTK workflows |

Broad compatibility ranges are not certified yet; release receipts record exact tested versions.

## Migrating to 3.0

Efficiency 3.0 gives each portable workflow one name across its skill and Cursor command. The old Cursor command names are removed without compatibility aliases:

| Before 3.0 | 3.0 replacement |
| --- | --- |
| `/optimize-context` | `/context-optimization` |
| `/create-rtk-filter` | `/rtk-filter-design` |
| `/setup-rtk` | `/rtk-setup` |

Agent Plugins and Codex remain skill-only surfaces. The Codex-only `$response-simplicity-setup` adapter is outside this four-workflow name parity.

## Migrating from 1.x

Efficiency 2.0 removed the old aliases; 3.0 keeps the smaller surface:

| 1.x entry point | Replacement |
| --- | --- |
| `/budget-efficiency` | `/efficiency` with a before-work request |
| `/review-efficiency` | `/efficiency` with an in-progress or after-work request |
| `efficiency-budget` | `efficiency` |
| `efficiency-review` | `efficiency` |
| `context-change-auditor` | `efficiency-auditor` with a context focus |

## Development and verification

```bash
npm ci
npm run release-check
git diff --check
```

The release check validates all three manifests and target bundles, Agent Skills discovery and frontmatter, path containment, version alignment, links, and policy contracts. Source links exclude ignored `.build` output, while every newly generated target is checked directly for bundle-local links. It proves repository format and bundle state—not installation, live host behavior, broad client compatibility, Marketplace state, or publication. The bounded Cursor smoke can check a supplied baseline restatement without an extra model call, but it leaves binding to the immediately preceding assistant response unverified unless that call is separately approved. The two-invocation Codex smoke combines a preceding-response restatement with setup status, so it can check response selection and segment fidelity but leaves exclusive restatement-only behavior unverified unless an additional call is separately approved.

Before a release, complete the [release checklist](docs/release-checklist.md). Runtime checks remain separate: [Agent Plugins runtime smoke](docs/agent-plugins-runtime-smoke.md), [Cursor runtime smoke](docs/runtime-smoke.md), and [Codex runtime smoke](docs/codex-runtime-smoke.md).

## Troubleshooting

- **Missing in Cursor:** verify the local path and `.cursor-plugin/plugin.json`, then reload Cursor.
- **Missing in Codex:** verify the personal marketplace entry and `.codex-plugin/plugin.json`, reinstall, restart Codex, and open a new task.
- **Rejected by an Agent Plugins client:** inspect that client's stated v1 support, then test only the generated `agent-plugins` bundle; repository conformance does not certify every client.
- **`rtk gain` fails:** verify that Rust Token Killer—not another `rtk` binary—is installed.
- **Project filters are skipped:** run `rtk verify --require-all`, complete RTK's trust flow, and re-trust after every filter edit.
- **Codex response guidance is inactive:** run `$response-simplicity-setup` for status; manifest installation alone does not activate global guidance.

## References

- [Codex plugin structure](https://developers.openai.com/codex/build-plugins)
- [Codex AGENTS.md precedence](https://developers.openai.com/codex/guides/agents-md)
- [Cursor plugin specification](https://github.com/cursor/plugins)
- [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification)
- [Agent Skills specification](https://agentskills.io/specification)
- [RTK documentation](https://www.rtk-ai.app/docs/)

## License

[MIT](LICENSE)
