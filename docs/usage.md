# Using Efficiency

[Back to Efficiency](../README.md) · [Installation](installation.md)

Efficiency helps your coding agent choose simpler solutions, maintain useful instructions, and explain its work clearly. A **skill** is a set of instructions for a particular task. You can select one explicitly or describe what you want and let your app choose a matching skill.

Start with the task you want help with:

| I want to… | Read this example | Skill |
| --- | --- | --- |
| Review or simplify code | [Review a change](#review-or-simplify-code) | `efficiency` |
| Choose useful checks without unnecessary work | [Plan verification](#choose-what-to-check) | `efficiency` |
| Improve a bug investigation or repeated work | [Keep work focused](#keep-debugging-and-repeated-work-focused) | `efficiency` |
| Remove duplicated agent instructions | [Improve context](#improve-agent-instructions) | `context-optimization` |
| Explain a change clearly | [Write a change summary](#explain-a-change-clearly) | `efficiency` |
| Reduce noisy terminal output | [Use RTK](#reduce-terminal-output-with-rtk-optional) | `rtk-setup`, `rtk-filter-design` |
| Make concise responses a lasting preference | [Set up response guidance](#make-clear-responses-a-lasting-preference) | `response-simplicity-setup` in Codex |

## Select a skill

In **Cursor**, type `/` followed by the skill name. In **Codex**, use `$geldmacher-efficiency:` followed by the skill name:

```text
/efficiency Review my current changes for unnecessary complexity.
```

```text
$geldmacher-efficiency:efficiency Review my current changes for unnecessary complexity.
```

The examples below use Cursor commands. In Codex, replace the command prefix in the same way; for example, `/context-optimization` becomes `$geldmacher-efficiency:context-optimization`.

Natural-language requests such as “Review this refactor for complexity” or “Find duplicated instructions in AGENTS.md” can also select the matching skill. Selection depends on your app and the task. Name the skill explicitly when you want to make your choice clear.

## Review or simplify code

Use this when a change is difficult to follow, adds new abstractions, or seems larger than the requirement needs.

```text
/efficiency Review my current changes. Can we meet the requirement with fewer concepts or reuse something already in this project?
```

You get a recommendation tied to the requirement and the code: what adds unnecessary complexity, what a simpler alternative would be, and which behavior must be checked before changing it. The review can also conclude that the current design is appropriate.

**Example:** A change adds a configurable formatter registry for one date format. The project already has a date helper. A useful recommendation is to reuse the helper after checking timezone and invalid-input behavior. An adapter that hides necessary transaction recovery may still be worth keeping, even if it has only one implementation.

These are illustrative examples, not recorded agent results or benchmarks.

A review leaves files unchanged. To request an implementation, name the change and its scope:

```text
/efficiency Replace the new formatter registry in this diff with the existing date helper. Preserve timezone and invalid-input behavior, and verify those cases.
```

You can also name a file or provide a design proposal. Without an explicit code scope, Efficiency uses the current Git changes, including staged, unstaged, and untracked files. If there are none, it asks what to review.

### How Efficiency chooses a simpler solution

The approach is called **Evidence-Guided Simplicity**: start from what the task requires and what the repository shows, then consider these options in order:

1. Omit work the requirement does not need.
2. Reuse something the project already provides.
3. Use a built-in language or platform feature.
4. Use an installed dependency if it reduces the overall burden.
5. Write the smallest local implementation that meets the requirement.

Three familiar principles guide the choice: build for current needs (**YAGNI**), keep the design easy to understand (**KISS**), and keep each shared rule in one authoritative place (**DRY**). Similar-looking code alone is not a reason to combine two rules that may change independently.

During ordinary coding work, this quick check usually stays in the background. An explicit review or a material complexity risk triggers a fuller comparison with one smaller alternative. Fewer lines are not the goal: behavior, public interfaces, saved data formats, security, accessibility, performance, and necessary error recovery must remain intact unless your assignment explicitly changes them.

## Choose what to check

Use this to decide which evidence would show that a proposed or completed change works.

```text
/efficiency What should we check for this date-formatting change? Explain which behavior each check would verify.
```

Efficiency identifies at most two facts that matter most to the risk and recommends the least costly adequate way to check them, alongside any required project checks.

**Example:** For a date helper, a focused check of timezone boundaries and invalid input may answer the main correctness questions. If the claim is that the date is readable in a browser, a unit test cannot establish that; an inspection of the rendered result is still needed.

The recommendation explains what the evidence proves and what remains unknown. Asking for a verification plan does not by itself start tests, servers, or live checks.

## Keep debugging and repeated work focused

Efficiency can help decide where to spend effort during an existing assignment.

### When attempted fixes leave the same failure

```text
/efficiency Review this investigation. Which observation would help distinguish
the remaining explanations for the failure?
```

You get a focused next check, including whether the failed fixes share an untested assumption.

### When many files need the same edit

```text
/efficiency Should we make these edits directly or write a small script?
Consider reruns and how we will verify the result.
```

You get a comparison of manual effort with the cost of building, checking, and maintaining a tool.

These requests produce advice. Diagnosis, fixes, scripts, and additional checks need to be part of the work you have asked the agent to carry out.

## Improve agent instructions

**Context** is the material an agent reads to do its work: project instructions, rules, skills, and tool output. Repeated or irrelevant instructions can make that material harder to maintain and use.

```text
/context-optimization Review AGENTS.md and this project's rules for duplicated or always-loaded instructions. Suggest a clearer structure without editing files yet.
```

You get specific suggestions about what to keep, combine, or load only when needed, with the constraints that must survive the change.

**Example:** If three files repeat the same test command, keep one authoritative instruction and clear references to it. If deployment instructions are long and only matter during a release, keep a short pointer that says exactly when to read them. Required security or approval rules must remain available wherever they apply.

To implement a recommendation, ask for it explicitly:

```text
/context-optimization Consolidate the duplicated test instructions in AGENTS.md and the project rules. Preserve required checks and make the shared instructions easy to find.
```

## Explain a change clearly

Use Efficiency to prepare a commit message, pull request description, release notes, or a change summary.

```text
/efficiency Draft a pull request description from this diff and the checks we ran. Explain the user-visible change and any remaining verification gaps.
```

The summary follows project conventions and leads with the result. It distinguishes what the diff changes, what checks actually passed, and what is still unverified. This request drafts text; it does not start a code review or an RTK inspection.

**Example:** “Invalid dates now show a validation message. The parser tests pass; the browser display has not been checked yet.” This tells a reviewer both what changed and the limit of the evidence.

For a one-off shorter answer, simply ask “Explain your last answer more simply.” No setup is needed; the rewrite should retain facts, risks, and open questions.

## Make clear responses a lasting preference

- **Cursor:** the plugin includes a short response rule that applies automatically.
- **Codex:** global response guidance is an optional, separate setup step. Ask `$geldmacher-efficiency:response-simplicity-setup Show the current status and preview setup.`

The Codex skill shows the proposed change to your global instructions before asking for approval. Once configured, start a new task. See [setup and removal](installation.md#optional-codex-response-guidance) for details.

## Reduce terminal output with RTK (optional)

**RTK (Rust Token Killer)** is a separate tool that condenses command output before the agent reads it. Efficiency can help inspect its integration and create project-specific output filters. You can use all other Efficiency workflows without installing RTK.

```text
/rtk-setup Check whether RTK is installed and integrated with my app. Report what works and what still needs setup.
```

This checks the current state. If you request configuration, the skill previews the affected settings before applying the authorized change.

For a recurring noisy command:

```text
/rtk-filter-design Review the output of our test command and suggest a filter that keeps failures, warnings, file paths, and the exit status intact.
```

An approved filter must preserve the meaning needed by its reader, including exact paths, important ordering, visible truncation, and output consumed by another program. If that cannot be established, the command should keep its native output. After editing a filter, complete RTK's trust step again before using it.

### What RTK numbers mean

| Evidence | What it tells you |
| --- | --- |
| Command history | Whether a command actually ran through RTK. |
| `rtk gain` | Estimated reduction in shell output within the reported scope. |
| Largest contributors | Which commands account for most of that reduction in absolute terms. |
| Comparable complete task runs | Whether the whole task used fewer provider tokens, cost less, or finished with fewer turns while preserving quality. |

A large `rtk gain` percentage alone does not establish lower total cost. That claim needs comparable runs with the same task, app, model, reasoning effort, and environment, plus provider usage and result-quality evidence.

## Behavior and boundaries

Skills can be selected explicitly or when relevant to a request. Only Cursor's short response rule is always applied; Codex needs the optional global setup for equivalent persistent guidance. Specialized instructions load for the task that needs them.

Reviews give recommendations and do not edit files. Implementation stays within the change you requested. Existing project checks and app approvals still apply, and concise answers must retain material evidence, uncertainty, risks, blockers, and validation status. Efficiency adds no custom MCP server, telemetry, or background automation.

If you explicitly ask for an independent second pass, Cursor provides the read-only `efficiency-auditor` and `rtk-filter-auditor`. Codex can delegate the corresponding review to a subagent using the selected parent model. Auditors do not run automatically.

## Compatibility

| App or component | Support |
| --- | --- |
| Cursor with plugin support | Five skills, matching slash commands, two optional auditors, and the response rule. |
| Codex with plugin support | The same five skills, plus `response-simplicity-setup`. |
| Other Agent Plugins v1 clients | Five portable skills; app-specific integration must be verified for that client. The release installer supports only Cursor and Codex. |
| Release installer and development tools | Node.js 22 or newer. See [installation requirements](installation.md#before-you-start). |
| Optional RTK integration | Documented workflows cover macOS, Linux, and WSL. Verified baselines are RTK 0.44.0 for Cursor hooks and 0.44.2 for Codex commands. |

The five shared skills are `efficiency`, `context-optimization`, `rtk-setup`, `rtk-filter-design`, and `install-new-release-from-repo`. Broad version compatibility is not certified; release records state the versions actually tested.

## Troubleshooting

| Problem | Next step |
| --- | --- |
| Skills are missing after installation | Follow [activation and installation checks](installation.md#finish-installation). |
| Codex responses do not follow the persistent guidance | Ask `$geldmacher-efficiency:response-simplicity-setup Check status.` Plugin installation alone does not configure it. |
| `rtk gain` fails | Check that the installed `rtk` is Rust Token Killer; another tool can use the same executable name. |
| Project filters are skipped | Run `rtk verify --require-all`, complete RTK's trust flow, and re-trust after each filter edit. |
| Another Agent Plugins client rejects the package | Check the client's stated v1 support and use the generated `agent-plugins` bundle. Repository checks do not certify every client. |

## Further reading

- [OpenAI Skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Cursor Skills documentation](https://prod.cursor.com/docs/skills)
- [Codex plugin structure](https://developers.openai.com/codex/build-plugins)
- [Codex AGENTS.md precedence](https://developers.openai.com/codex/guides/agents-md)
- [Cursor plugin specification](https://github.com/cursor/plugins)
- [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification)
- [Agent Skills specification](https://agentskills.io/specification)
- [RTK documentation](https://www.rtk-ai.app/docs/)
