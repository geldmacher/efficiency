# Three-target release checklist

Complete this checklist before tagging a plugin release. Use a clean checkout or a recorded dirty baseline and record every skipped item with a reason.

## Automated repository gates

- [ ] `npm ci`
- [ ] `npm run release-check`
- [ ] `npm pack --dry-run --json` with an isolated temporary npm cache
- [ ] `git diff --check`
- [ ] The working tree contains no unexpected generated changes after the gates.

## Instruction coverage

Use these cases to inspect the selected reference and its entrypoint before reporting instruction coverage. This is a content review, not evidence that a host or model executed the guidance. An authorized live evaluation may use a selected case and its raw inputs within the existing host smoke budget; keep the expected decision separate from the evaluating agent's prompt. Do not run all cases automatically.

| Case and input | Required decision | Reference |
| --- | --- | --- |
| Two import callers use the same parser, but a proposed fix changes only the UI caller. The second caller is a batch job. | Trace the common cause and affected callers; prefer the shared correction within scope and report an out-of-scope caller. | [Design](../skills/efficiency/references/design-and-code-simplicity.md) |
| One adapter has one implementation but hides transaction ordering and recovery from several callers. | Preserve the useful boundary if deletion spreads that complexity; assess ordering, errors, configuration, and performance as part of the interface. | [Design](../skills/efficiency/references/design-and-code-simplicity.md) |
| A calculation stores intermediate results in module state and constructs a service internally, making independent runs interfere. | Consider local state, returned results, and controllable dependencies; preserve required side effects and test the actual caller-visible behavior. | [Design](../skills/efficiency/references/design-and-code-simplicity.md) |
| A comment explains an external protocol constraint; another records a deliberate scan limit and when it becomes too expensive. | Retain necessary rationale and explain the concrete limit and change trigger; remove only redundant commentary. | [Design](../skills/efficiency/references/design-and-code-simplicity.md) |
| A race fails in 3 of 20 observations; one post-change run passes and a new unit test omits the multi-caller interaction. | A single pass is insufficient. Compare controlled observations against falsifiable hypotheses; require the original scenario, a suitable regression seam, and cleanup evidence. | [Debugging](../skills/efficiency/references/debugging-feedback-economy.md) |
| A serializer changes a field used by a worker in another language; a current timestamp is the only success evidence. | Follow the serialized contract and indirect consumer, check relevant versions and lifecycle timing, and inspect actual output rather than freshness. Resolve conflicting observation methods before dependent work continues. | [Verification](../skills/efficiency/references/verification-economy.md) |
| A context pointer says only "extra guidance" and completion says "write a summary" although three distinct task cases matter. | Sharpen matching and non-matching load conditions; make completion account for all three cases before adding files or a handoff. | [Agent documents](../skills/context-optimization/references/agent-document-design.md) |
| A one-off migration has many records and a checked representative transformation; a script could verify the rest reliably. | Compare total tool cost against verification benefit, compare its result with the checked example, and assess safe reruns. A few obvious edits can still be cheaper directly. | [Repeatable work](../skills/efficiency/references/repeatable-work-economy.md) |
| A report says "It only updates them after it finishes" for a client, worker, and shared records. | Name the actors and records, attach conditions to the right action, and split the sentence if needed without removing meaning. | [Communication](../skills/efficiency/references/human-communication.md) |
| RTK reports 90% shell-output reduction; one paired run is cheaper but another fails during setup. | Keep compression separate from task cost; report variation and failed or excluded runs. Do not claim a repeatable saving or start another benchmark automatically. | [RTK evidence](../skills/efficiency/references/rtk-evidence.md) |

For every case, an assessment request remains read-only. Recommendations do not grant execution permissions. Structural tests verify routing, package contents, and instruction contracts; live outcomes require separately recorded observations.

## GitHub Release mechanism

- [ ] `$release-plugin`, `/release-plugin`, metadata, and `release:plugin` expose exactly one explicit no-argument journey outside every generated target.
- [ ] Preflight proves GitHub availability and authentication, commit identity, expected repository, synchronized `main`, NUL-safe complete candidate paths, consistent versions, and release-ready notes before tracked mutation.
- [ ] At most one exact `Release v{version}` commit is created; the final staged tree is compared with `HEAD`, and retry state is bound before the commit boundary.
- [ ] Cursor and Codex preparations are byte-identical across repeated builds and produce one-root archives, checksums, notes, and closed provenance without Agent Plugins or development leakage.
- [ ] Only a lightweight tag is accepted; `main` and the tag update atomically, while mixed remote state stops without repair, overwrite, deletion, reset, force-push, or clobbering.
- [ ] GitHub metadata and all downloaded asset bytes pass read-back verification before success is reported.
- [ ] The [GitHub installation guide](installation.md) covers checksums, host layouts, Codex Marketplace handling, updates, rollback, reload, and fresh-task activation.
- [ ] Building this mechanism performs no live commit, tag, push, publication, deployment, installation, or host restart.

## Format and repository integrity

- [ ] Root `plugin.json`, Cursor manifest, Codex manifest, package, lockfile, and changelog versions agree at 3.1.0.
- [ ] Agent Plugins 1.0.0 remains visibly marked as a Working Draft and pinned to commit `bd383552095128f6effe895b9257cfd580a6d179`.
- [ ] `schemas/agent-plugins/1.0.0/plugin.schema.json` and `schemas/plugin.schema.json` match their recorded SHA-256 values byte-for-byte.
- [ ] Root `plugin.json` validates through the vendored Draft 2020-12 schema and has no `extensions` field.
- [ ] Agent Skills frontmatter, directory names, immediate discovery, regular-file requirements, and realpath containment validate.
- [ ] The repository contains four portable skills, four Cursor skills, and one Codex-only adapter source under `adapters/codex/skills`.
- [ ] The portable source has no `mcp.json`; native targets declare no plugin hooks, MCP servers, apps, or telemetry.
- [ ] Cursor declares the four shared skills explicitly and excludes `response-simplicity-setup`.
- [ ] Codex declares `./skills/`; `.codex-plugin` contains only `plugin.json`; the generated Codex target has exactly five immediate root skills.
- [ ] Shared skill names and frontmatter match their directories.
- [ ] Cursor command filenames, frontmatter names, and delegated portable skill names match exactly; `/optimize-context`, `/create-rtk-filter`, and `/setup-rtk` exist only in current migration guidance or immutable historical receipts.
- [ ] Cursor agents are read-only adapters and their authoritative policies live under shared skill references.
- [ ] Cursor response-rule content matches the canonical Codex response guidance.
- [ ] All four portable skills link to the shared human communication contract; only the `efficiency` workflow conditionally loads the focused change communication contract.
- [ ] The `efficiency` description front-loads coding, refactoring, and technical design so normal implicit selection can apply Evidence-Guided Simplicity without a new command, skill, hook, or always-on rule.
- [ ] `context-optimization` loads agent-document design only for agent-consumed context and retains read-only analysis unless an edit is explicitly authorized.
- [ ] `efficiency` and its auditor use one shared design-and-code simplicity reference and perform at most one bounded challenge without manufacturing a finding.
- [ ] The quick ladder stops at the first evidence-supported sufficient choice in this order: omit unnecessary work, reuse project capability, use standard or native capability, use a suitable installed dependency, then add the smallest local implementation.
- [ ] YAGNI rejects speculative scope, KISS targets concepts and reader burden rather than lines, and DRY consolidates authority rather than merely similar syntax; all preserve the documented correctness and quality boundaries.
- [ ] README and all three manifests present Evidence-Guided Simplicity as the primary qualitative benefit, include the five search keywords, and avoid unsupported numerical claims.
- [ ] Verification-economy guidance names at most two risk-bearing facts, selects the cheapest adequate direct evidence, distinguishes proxy and live evidence, and remains non-authorizing.
- [ ] Repeatable-work guidance compares direct work with the complete tool cost, prefers a deterministic rerunnable tool over identical delegated transformations only when justified, and does not authorize tests, checks, scripts, tools, file changes, artifacts, delegation, servers, deployment, live access, or scope expansion.
- [ ] The bounded simplicity challenge assesses trace depth and hidden or mutable state, checks removable complexity before additions, and preserves comments when code cannot express their rationale or external constraint.
- [ ] Debugging-feedback guidance remains advisory and does not authorize diagnosis, instrumentation, tests, fixes, delegation, servers, or persisted artifacts.
- [ ] RTK evidence reporting separates execution coverage, scoped estimated shell-output reduction, absolute contributor concentration, and unverified whole-task net effect; it states host and scope and persists no machine-specific gain totals.
- [ ] RTK filter guidance recommends no filter unless complete exact paths, material ordering, explicit truncation, exit status, warnings, and machine-consumed or piped output remain semantically equivalent to native output.
- [ ] Communication contracts preserve evidence and exact technical text, distinguish verified, intended, and open status, and add no style detector, score, fixed response template, separate communication skill, README trigger, or RFC trigger.
- [ ] Cursor and Codex response guidance restate only the last response more plainly and briefly without new analysis or claims, remain byte-identical after frontmatter removal, and keep the Cursor rule below 1,200 characters.
- [ ] Source documentation links resolve independently of `.build`; the 3.0 migration table covers all renamed Cursor commands, the 1.x table covers every older removed entry point, and historical receipt files remain byte-identical.

## Built-bundle isolation

- [ ] `.build/plugins/agent-plugins/geldmacher-efficiency` contains root `plugin.json`, exactly four portable skills, and no Cursor or Codex components.
- [ ] `.build/plugins/cursor/geldmacher-efficiency` contains `.cursor-plugin` and its native surface but no root `plugin.json`, `.codex-plugin`, or Codex-only skill.
- [ ] `.build/plugins/codex/geldmacher-efficiency` contains a manifest-only `.codex-plugin`, four portable root skills, and `skills/response-simplicity-setup`, but no root `plugin.json` or Cursor-only surface.
- [ ] Every generated target passes its own bundle-local Markdown link check and contains the vendored schema referenced by the shared README.
- [ ] Every generated target contains all references linked from `context-optimization` and `efficiency` without changing portable or native component counts.
- [ ] Each of the four shared skill directories is byte-identical across the Agent Plugins, Cursor, and Codex targets.
- [ ] Repeated builds produce identical hashes for all three targets.
- [ ] The positive npm allowlist includes root `plugin.json`, the Codex adapter source, and only intended runtime, metadata, documentation, and schema content.
- [ ] `deploy:local` still accepts only Cursor and Codex host scopes; it has no Agent Plugins or `--all` deployment mode.

## Cursor discovery and behavior

- [ ] Install or link only the Cursor target at `~/.cursor/plugins/local/geldmacher-efficiency` after separate approval.
- [ ] Reload the Cursor window or restart Cursor.
- [ ] Confirm all four commands, four skills, two agents, and the always-on `response-simplicity` rule are discoverable.
- [ ] Confirm both agents remain read-only and inherit the selected parent model.
- [ ] `/rtk-setup` identifies RTK, previews setup, and preserves the existing `allow`/`ask` path.
- [ ] A finite supported command retains its RTK `updated_input`; `ask` does not execute before approval.
- [ ] `/rtk-filter-design` preserves native command semantics, failures, and warnings, passes `rtk verify --require-all`, and requires renewed trust after edits.
- [ ] A natural coding, refactoring, or design request without `/efficiency` can select the existing skill, stop at the first sufficient safe approach, and avoid unnecessary principle narration; `/efficiency` remains available explicitly.
- [ ] `/efficiency` handles task economy, proportionate verification, repeated-work decisions, one scoped design/code-simplicity challenge, and advisory debugging-feedback review without modifying files on a review request.
- [ ] `/context-optimization` can review agent-consumed documents without editing context on an analysis-only request.
- [ ] Under the bounded two-conversation Cursor smoke, distinguish supplied-baseline restatement evidence from immediate last-response binding; keep the latter `unverified` without separate approval for an additional model invocation.

## Codex discovery and behavior

- [ ] Resolve the intended Codex source path before changing it; do not overwrite a foreign target.
- [ ] Add or update the personal Marketplace entry only after separate approval.
- [ ] Install with `codex plugin add geldmacher-efficiency@<personal-marketplace-name>` only after separate approval.
- [ ] Restart Codex and use a fresh task.
- [ ] Confirm exactly five skills are discoverable and Cursor-only directories are not exposed as Codex components.
- [ ] `$rtk-setup` selects `rtk init --codex --show`, previews `rtk init --global --codex --dry-run`, and does not promise Cursor hook evidence.
- [ ] Direct RTK execution of one approved finite command appears in `rtk gain --history`; record this only as execution evidence and keep whole-task token, turn, quality, and cost effects unverified without a comparable paired run.
- [ ] `$efficiency` and `$context-optimization` expose the same conditional verification, repeatable-work, design, debugging-feedback, and agent-document behavior as the portable source without adding a skill.
- [ ] A natural coding, refactoring, or design request without explicitly invoking `$efficiency` can select it implicitly, stop at the first sufficient safe approach, and avoid unnecessary principle narration.
- [ ] Independent review delegation occurs only after an explicit request, stays bounded and read-only, and inherits the parent model.
- [ ] `$response-simplicity-setup` status and diff preview are read-only by default.
- [ ] Under the bounded three-invocation Codex smoke, keep implicit simplicity selection, RTK setup, and response-guidance evidence distinct; keep exclusive restatement-only behavior `unverified` without separate approval for an additional model invocation.

## Global AGENTS safety fixtures

- [ ] Tests use temporary directories only; they never edit the real Codex home.
- [ ] A non-empty `AGENTS.override.md` wins; otherwise `AGENTS.md` is selected.
- [ ] Existing content, including an RTK import, remains byte-for-byte unchanged outside the managed block.
- [ ] Install and update are idempotent and replace one well-formed block rather than duplicating it.
- [ ] Removal deletes only the marked Efficiency block.
- [ ] Missing, duplicated, malformed, or similar unmarked guidance causes a stop.
- [ ] Every real install, update, or removal shows the exact diff and waits for explicit approval.
- [ ] A successful real change is tested only in a new Codex task.

## Runtime receipts and publication status

- [ ] Approve an explicit model-call and cost limit before any live smoke.
- [ ] Test the [Agent Plugins target](agent-plugins-runtime-smoke.md), [Cursor target](runtime-smoke.md), and [Codex target](codex-runtime-smoke.md) separately.
- [ ] Use an isolated, conflict-free client state for the Agent Plugins target; do not load a native target in the same smoke.
- [ ] Record client, host, RTK, Node.js, platform, model, invocation count, cost ceiling, baseline commit, runtime hashes, and observed results.
- [ ] Restore the intended enabled state after baseline tests.
- [ ] Review the final diff for secrets, machine-specific paths, unrelated files, and runtime artifacts.
- [ ] Report Format conformance, Built bundle, Cursor runtime, Codex runtime, and publication status as separate evidence classes.
- [ ] Do not infer installation or runtime activation from repository validation, bundle generation, or local Marketplace availability.
- [ ] Do not infer actual human comprehension from static communication-policy checks; record a separately authorized fresh-host comparison if that evidence is required.
- [ ] Do not claim compatibility with every Agent Plugins client from repository checks or one smoke.
- [ ] Commit, push, tag, Marketplace submission, and public publication require separate instructions and are not part of this checklist execution.
