# Using Efficiency

[Back to Efficiency](../README.md)

Efficiency supports coding, refactoring, context maintenance, and clear communication. The guidance is written for mixed technical knowledge and preserves exact technical text.

RTK is optional. Efficiency treats RTK gain figures as estimated shell-output reduction, not as proof of fewer provider-billed tokens, lower cost, or fewer agent turns.

## Evidence-Guided Simplicity

For relevant coding, refactoring, and technical-design tasks, the existing `efficiency` skill applies a short ladder and stops at the first option supported by the requirements and repository: omit unnecessary work, reuse a project capability, use the standard library or native platform, use an installed dependency only when it lowers total burden, and otherwise add the smallest local implementation.

- **YAGNI** removes speculative requirements and unproved flexibility.
- **KISS** reduces independent concepts, trace depth, hidden state, and interface burden rather than chasing fewer lines or files.
- **DRY** keeps knowledge, rules, decisions, and validation in one authoritative place; similar syntax alone does not justify an abstraction.

The quick decision stays silent unless it changes the solution, scope, or material risk, or you ask for the reasoning. A full simplicity challenge runs only when requested or when the quick pass finds a material complexity risk, and then runs once. User requirements, public interfaces, persisted formats, correctness, security, accessibility, data-loss protection, performance, lifecycle semantics, domain distinctions, project conventions, and proportionate verification remain protected.

Efficiency does not prioritize one-liners, use line-count metrics or intensity modes, prescribe a fixed one-test rule, or claim quantitative benefits without evidence.

## What you get

| Goal | Agent Plugins v1 | Cursor | Codex |
| --- | --- | --- | --- |
| Right-size work and validation | `efficiency` skill | `/efficiency` | `$efficiency` |
| Challenge design and code simplicity | `efficiency` skill | `/efficiency` | `$efficiency` |
| Reduce recurring context | `context-optimization` skill | `/context-optimization` | `$context-optimization` |
| Inspect or prepare RTK | `rtk-setup` skill | `/rtk-setup` | `$rtk-setup` |
| Design a safe RTK filter | `rtk-filter-design` skill | `/rtk-filter-design` | `$rtk-filter-design` |
| Install the latest stable Efficiency release | Skill available; installer supports Cursor/Codex | `/install-new-release-from-repo` | `$geldmacher-efficiency:install-new-release-from-repo` |
| Keep responses concise | Not in the portable core | Automatic `response-simplicity` rule | Optional `$response-simplicity-setup` |

Cursor also includes the optional read-only `efficiency-auditor` and `rtk-filter-auditor`. Codex can run the same checks through an inherited subagent when you explicitly request a second pass.

The Agent Plugins target contains five portable skills: `efficiency`, `context-optimization`, `install-new-release-from-repo`, `rtk-filter-design`, and `rtk-setup`. Cursor exposes those five workflows as skills and slash commands. Codex discovers six skills: the same five portable skills plus its native `response-simplicity-setup` adapter.

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

For responses, Efficiency first considers whether the reader must act, decide, or understand, then keeps project terms exact, conditions before actions, and the common path before exceptions. If asked to restate the last response more simply, it rewrites only that response and preserves material facts, evidence, risks, and open gaps without adding new analysis or claims. For commit messages, pull request descriptions, release notes, and change summaries, the workflow follows project conventions first and distinguishes verified behavior, intended behavior, and open work; material claims should trace to the diff, a check, other evidence, or a labelled assumption. This guidance stays within the existing communication workflows; it does not extend them to READMEs or RFCs or prove that a change works.

## Behavior and boundaries

- Portable skills remain explicitly invokable and are also available for normal relevance-based implicit selection. Only Cursor loads the short response rule on every task.
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

## Troubleshooting

- **Missing in Cursor:** verify the local path and `.cursor-plugin/plugin.json`, then reload Cursor.
- **Missing in Codex:** verify the personal marketplace entry and `.codex-plugin/plugin.json`, reinstall, restart Codex, and open a new task.
- **Rejected by an Agent Plugins client:** inspect that client's stated v1 support, then test only the generated `agent-plugins` bundle; repository conformance does not certify every client.
- **`rtk gain` fails:** verify that Rust Token Killer—not another `rtk` binary—is installed.
- **Project filters are skipped:** run `rtk verify --require-all`, complete RTK's trust flow, and re-trust after every filter edit.
- **Codex response guidance is inactive:** run `$response-simplicity-setup` for status; manifest installation alone does not activate global guidance.

## References

- [OpenAI Skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Cursor Skills documentation](https://prod.cursor.com/docs/skills)
- [Codex plugin structure](https://developers.openai.com/codex/build-plugins)
- [Codex AGENTS.md precedence](https://developers.openai.com/codex/guides/agents-md)
- [Cursor plugin specification](https://github.com/cursor/plugins)
- [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification)
- [Agent Skills specification](https://agentskills.io/specification)
- [RTK documentation](https://www.rtk-ai.app/docs/)
