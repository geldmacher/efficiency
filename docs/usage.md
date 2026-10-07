# Using Efficiency

[Back to Efficiency](../README.md) · [Installation](installation.md)

Efficiency helps your coding agent choose simpler solutions, maintain useful instructions, and explain its work clearly. After [installation and activation](installation.md#finish-installation), use the following everyday approach.

## Recommended everyday use

Give your agent an ordinary task with a clear goal and scope. Cursor's short rule accompanies that work automatically. In Codex, equivalent guidance across projects needs the [optional persistent setup](#make-clear-responses-a-lasting-preference); the skills work without it.

Call a skill when you want a focused review, assessment, or change text. A **skill** is a set of instructions for a particular task. You do not need to request an extra efficiency review or report for every change. Complete all agreed requirements and required checks; stop optional refinement when it would no longer materially improve the result.

| I want to… | Read this example | Skill |
| --- | --- | --- |
| Complete an ordinary development task | Describe the required change and scope as usual | No extra skill needed |
| Review or simplify code | [Review a change](#review-or-simplify-code) | `efficiency` |
| Choose useful checks without unnecessary work | [Plan verification](#choose-what-to-check) | `efficiency` |
| Improve a bug investigation or repeated work | [Keep work focused](#keep-debugging-and-repeated-work-focused) | `efficiency` |
| Remove duplicated agent instructions | [Improve context](#improve-agent-instructions) | `context-optimization` |
| Explain a change clearly | [Write a change summary](#explain-a-change-clearly) | `efficiency` |
| Reduce noisy terminal output | [Use RTK](#reduce-terminal-output-with-rtk-optional) | `rtk-setup`, `rtk-update`, `rtk-filter-design` |
| Make concise responses and simple code changes a lasting preference | [Set up persistent guidance](#make-clear-responses-a-lasting-preference) | `response-simplicity-setup` in Codex |

## Select a skill

In **Cursor**, type `/` followed by the skill name. In **Codex**, use `$geldmacher-efficiency:` followed by the skill name. Each core example below includes the complete request for both apps.

Natural-language requests such as “Review this refactor for complexity” or “Find duplicated instructions in AGENTS.md” can also select the matching skill. Selection depends on your app and the task. Name the skill explicitly when you want to make your choice clear.

## Review or simplify code

**When:** a change is difficult to follow, adds new abstractions, or seems larger than the requirement needs.

**Cursor:**

```text
/efficiency Review my current changes. Can we meet the requirement with fewer concepts or reuse something already in this project?
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Review my current changes. Can we meet the requirement with fewer concepts or reuse something already in this project?
```

**Result:** recommendations tied to the requirement and the code: what adds unnecessary complexity, what a simpler alternative would be, and which behavior must be checked before changing it. The review can also conclude that the current design is appropriate. Files stay unchanged.

**Example:** A change adds a configurable formatter registry for one date format. The project already has a date helper. A useful recommendation is to reuse the helper after checking timezone and invalid-input behavior. An adapter that hides necessary transaction recovery may still be worth keeping, even if it has only one implementation.

These are illustrative examples, not recorded agent results or benchmarks.

You can name a file or provide a design proposal. Without an explicit code scope, Efficiency uses the current Git changes, including staged, unstaged, and untracked files. If there are none, it asks what to review.

**Next:** choose a recommendation and request its implementation with a concrete scope. For the formatter example above:

**Cursor:**

```text
/efficiency Replace the new formatter registry in this diff with the existing date helper. Preserve timezone and invalid-input behavior, and verify those cases.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Replace the new formatter registry in this diff with the existing date helper. Preserve timezone and invalid-input behavior, and verify those cases.
```

This requests the selected change and its verification. It does not authorize unrelated cleanup, commits, or delivery.

## Choose what to check

**When:** you need to decide which evidence would show that a proposed or completed change works.

**Cursor:**

```text
/efficiency What should we check for this date-formatting change? Explain which behavior each check would verify.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency What should we check for this date-formatting change? Explain which behavior each check would verify.
```

**Result:** a verification recommendation covering every independent material risk in scope with the smallest set of facts and the least costly adequate checks, alongside required project checks. It explains what the evidence would prove and what would remain unknown. This request does not start tests, servers, or live checks.

**Example:** For a date helper, a focused check of timezone boundaries and invalid input may answer the main correctness questions. If the claim is that the date is readable in a browser, a unit test cannot establish that; an inspection of the rendered result is still needed.

**Next:** ask the agent to run the selected checks as part of your implementation or verification assignment.

## Keep debugging and repeated work focused

Use these assessments to decide where to spend effort during an existing assignment.

### When attempted fixes leave the same failure

**When:** attempted fixes have not explained or resolved a failure.

**Cursor:**

```text
/efficiency Review this investigation. Which observation would help distinguish
the remaining explanations for the failure?
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Review this investigation. Which observation would help distinguish
the remaining explanations for the failure?
```

**Result:** a focused next check, including whether the failed fixes share an untested assumption. The assessment gives advice; it does not diagnose or fix the code by itself.

**Next:** request the proposed investigation step within the debugging assignment, then use its result to decide on a fix.

### When many files need the same edit

**When:** the same edit is needed across many files and you are considering a script.

**Cursor:**

```text
/efficiency Should we make these edits directly or write a small script?
Consider reruns and how we will verify the result.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Should we make these edits directly or write a small script?
Consider reruns and how we will verify the result.
```

**Result:** a comparison of manual effort with the cost of building, checking, and maintaining a tool. This request produces advice and makes no edits.

**Next:** select the approach and ask for the named edits or script, including the agreed verification.

## Improve agent instructions

**When:** project instructions are duplicated, hard to find, or loaded when they are irrelevant. **Context** is the material an agent reads to do its work: project instructions, rules, skills, and tool output.

**Cursor:**

```text
/context-optimization Review AGENTS.md and this project's rules for duplicated or always-loaded instructions. Suggest a clearer structure without editing files yet.
```

**Codex:**

```text
$geldmacher-efficiency:context-optimization Review AGENTS.md and this project's rules for duplicated or always-loaded instructions. Suggest a clearer structure without editing files yet.
```

**Result:** specific suggestions about what to keep, combine, or load only when needed, with the constraints that must survive the change. Files stay unchanged.

**Example:** If three files repeat the same test command, keep one authoritative instruction and clear references to it. If deployment instructions are long and only matter during a release, keep a short pointer that says exactly when to read them. Required security or approval rules must remain available wherever they apply.

**Example:** An always-on rule is proposed only because an agent keeps repeating a mistake. Prefer a test or lint the repository can run, or a change that removes the need for the instruction. Keep concise guidance when the agent still needs the requirement, even if a check also enforces it.

**Next:** request the selected recommendation and name the affected instructions. For the duplicated-test-instructions example:

**Cursor:**

```text
/context-optimization Consolidate the duplicated test instructions in AGENTS.md and the project rules. Preserve required checks and make the shared instructions easy to find.
```

**Codex:**

```text
$geldmacher-efficiency:context-optimization Consolidate the duplicated test instructions in AGENTS.md and the project rules. Preserve required checks and make the shared instructions easy to find.
```

This requests that specific consolidation while preserving required checks and applicable approval rules.

## Explain a change clearly

**When:** you need a commit message, pull request description, release notes, or a change summary.

**Cursor:**

```text
/efficiency Draft a pull request description from this diff and the checks we ran. Explain the user-visible change and any remaining verification gaps.
```

**Codex:**

```text
$geldmacher-efficiency:efficiency Draft a pull request description from this diff and the checks we ran. Explain the user-visible change and any remaining verification gaps.
```

**Result:** a draft following project conventions and leading with the result. It distinguishes what the diff changes, what checks actually passed, and what is still unverified. When useful, it includes a compact sketch or existing before/after evidence, rollback difficulty, and affected people or systems. This request drafts text; it does not publish it, start a code review, or inspect RTK.

**Example:** “Invalid dates now show a validation message. The parser tests pass; the browser display has not been checked yet.” This tells a reviewer both what changed and the limit of the evidence.

**Next:** review the draft and use it in your chosen commit or pull request workflow. Any commit or publication needs its own assignment.

For a one-off shorter answer, simply ask “Explain your last answer more simply.” No setup is needed; the rewrite should retain facts, risks, and open questions.

## Make clear responses a lasting preference

- **Cursor:** the plugin includes a short rule for clear responses and simple, in-scope code changes. It applies automatically. The same rule writes rules, skills, commands, `AGENTS.md`, and new code in English, including comments and names, and keeps replies in the user's language.
- **Codex:** the same global guidance is an optional, separate setup step. Installing the plugin does not configure it; the skills remain usable without it.

**When:** you want the Codex guidance to apply across projects.

**Codex:**

```text
$geldmacher-efficiency:response-simplicity-setup Show the current status and preview setup of persistent response guidance. Do not change configuration.
```

**Result:** the current configuration status and the proposed patch to your global instructions. The preview changes nothing.

**Next:** if you want the setup, approve the displayed patch and request that it be applied, then start a new task. The configured reference remains until removed separately; disabling the plugin does not remove it. See [setup and removal](installation.md#optional-codex-response-guidance).

## Reduce terminal output with RTK (optional)

**RTK (Rust Token Killer)** is a separate tool that condenses command output before the agent reads it. Efficiency can inspect, install or update RTK, verify its integration and create project-specific output filters. You can use all other Efficiency workflows without installing RTK.

**When:** extensive terminal output makes work harder to follow and you want to check whether RTK is available and integrated.

**Cursor:**

```text
/rtk-setup Check whether RTK is installed and integrated with my app. Report what works and what still needs setup.
```

**Codex:**

```text
$geldmacher-efficiency:rtk-setup Check whether RTK is installed and integrated with my app. Report what works and what still needs setup.
```

**Result:** an assessment of the current state. This inspection changes no configuration. Reducing terminal output alone does not establish lower total task cost; see [what RTK numbers mean](#what-rtk-numbers-mean).

**Next:** if setup is needed, request a preview of the required changes before deciding to apply them. If RTK was updated externally, check its integration as described below.

### Check integration after an external update

**Cursor:**

```text
/rtk-setup Check RTK integration after the update. Compare the installed version and current upstream guidance with this app's configuration. Inspect setup dry-runs, command rewriting, native approvals, tracking, and output quality. Report the smallest needed changes; do not change configuration.
```

**Codex:**

```text
$geldmacher-efficiency:rtk-setup Check RTK integration after the update. Compare the installed version and current upstream guidance with this app's configuration. Inspect setup dry-runs, command rewriting, native approvals, tracking, and output quality. Report the smallest needed changes; do not change configuration.
```

The update check distinguishes configured hooks, processor results, actual execution in the app, and output quality. Codex can use native hooks or instruction-based integration depending on the installed RTK and active Codex runtime. A terminal test or history entry alone does not prove automatic rewriting in either app.

### Update or configure RTK

To update existing RTK, invoke `/rtk-update` in Cursor or `$geldmacher-efficiency:rtk-update` in Codex. A bare invocation requests the latest official stable release and verification of the existing host integration, including necessary adjustments after a concrete preview. To inspect availability without changes, use `/rtk-update Check whether an update is available; do not change anything.` For a preview, use `/rtk-update Preview the update; do not apply it.`

The update skill stops when RTK is absent and points to `rtk-setup` for first installation. Setup also handles configuration, removal, diagnosis, and integration checks after an external update. Existing `/rtk-setup Update RTK...` requests delegate to `rtk-update`.

Both skills use the same lifecycle helper and integration references. The update procedure previews the identified package-manager command, preserves pins and newer/development installations, and gives instructions for unknown/manual binaries. In this plugin's development checkout, an authorized update also reconciles affected source instructions, even when RTK is already current; read-only and preview requests only report findings. Installed plugin bundles are updated through plugin releases.

After a successful Efficiency plugin update, `install-new-release-from-repo` also checks RTK. It offers first installation through `rtk-setup` or a needed update through `rtk-update` separately. Only your acceptance starts RTK changes; a decline or RTK failure leaves the successful plugin update intact. Checks run on these relevant invocations, without a background watcher.

If you request configuration, the skill previews the affected settings before applying the authorized change. Generated `RTK.md` content belongs to `rtk init` and can change between versions. Setup examples and verification instructions in older versions apply to setup or troubleshooting. Before replacing a file with custom additions, account for needed tracking, environment, and sandbox settings in user-owned configuration or instructions; do not silently lose them or hand-edit the generated file as a durable fix.

For native Codex integration, the skill explains the local RTK hook before asking you to trust it. An authorized setup adds a missing execution status message such as `RTK – Compact terminal output` or, in German, `RTK – Terminalausgaben komprimieren`, while preserving existing custom messages. This message describes the hook while it runs; the trust dialog may still call it "Hook 1". Metadata does not replace Codex's trust review, and changes to the hook definition may require renewed trust. Inspection-only requests leave configuration unchanged. The displayed title and status are verified separately in a local setup; until observed, they remain unverified.

### Filter a recurring noisy command

**Cursor:**

```text
/rtk-filter-design Review the output of our test command and suggest a filter that keeps failures, warnings, file paths, and the exit status intact.
```

**Codex:**

```text
$geldmacher-efficiency:rtk-filter-design Review the output of our test command and suggest a filter that keeps failures, warnings, file paths, and the exit status intact.
```

This review proposes a filter and leaves files unchanged. To create it, request the selected filter explicitly.

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

Skills can be selected explicitly or when relevant to a request. Only Cursor's short rule for responses and code changes is always applied; Codex needs the optional global setup for equivalent persistent guidance. That rule routes ordinary debugging, verification, repeated-work, and design decisions to the matching Efficiency reference; the `efficiency` skill itself is a short router for explicit reviews, assessments, and change texts. Specialized instructions load for the task that needs them.

Reviews give recommendations and do not edit files. Implementation stays within the change you requested. Existing project checks and app approvals still apply, and concise answers must retain material evidence, uncertainty, risks, blockers, and validation status. Efficiency adds no custom MCP server, telemetry, or background automation.

If you explicitly ask for an independent second pass, Cursor provides the read-only `efficiency-auditor` and `rtk-filter-auditor`. Codex can delegate the corresponding review to a subagent using the selected parent model. Auditors do not run automatically.

### How Efficiency chooses a simpler solution

The approach is called **Evidence-Guided Simplicity**: start from what the task requires and what the repository shows, then consider these options in order:

1. Omit work the requirement does not need.
2. Reuse something the project already provides.
3. Use a built-in language or platform feature.
4. Use an installed dependency if it reduces the overall burden.
5. Write the smallest local implementation that meets the requirement.

Three familiar principles guide the choice: build for current needs (**YAGNI**), keep the design easy to understand (**KISS**), and keep each shared rule in one authoritative place (**DRY**). Similar-looking code alone is not a reason to combine two rules that may change independently.

Ordinary code changes do not need an explicit invocation of this skill. The always-applied guidance keeps a short core for them: reuse what exists, build only what the requirement needs, stay in scope, and preserve behavior. It also points to the debugging, verification, repeated-work, and design references when one of those situations arises, so they apply silently without an efficiency assessment. In Codex, that persistent guidance requires the optional setup.

When this skill reviews or changes code, the quick check stays quiet unless it changes the chosen solution, scope, or risk. An explicit review or a material complexity risk triggers a fuller comparison with one smaller alternative. Fewer lines are not the goal: behavior, public interfaces, saved data formats, security, accessibility, performance, and necessary error recovery must remain intact unless your assignment explicitly changes them.

**Example:** A large new TypeScript module adds several `any` casts, an empty `catch`, and two near-identical helpers. A useful recommendation is to narrow the types, surface the error, and keep one helper — without demanding a coverage or mutation score the project does not already enforce. This is an illustrative example, not a recorded result.

### How Efficiency prioritizes effort

Efficiency uses **Pareto prioritization** to focus effort on the work that most advances the agreed goal or reduces material risk, accounting for effort and dependencies. "80/20" is a heuristic: all agreed requirements, required checks, and necessary safeguards still apply, including rare failures with severe consequences. Optional refinement stops when it would no longer materially improve the outcome.

A short task-focus principle applies through the Cursor rule and configured Codex response guidance. The detailed assessment stays in the Efficiency skill's task-effort branch; ordinary tasks need no extra reference read or separate prioritization report.

**Example:** Several callers fail because of one shared parsing error. Fix the common cause within the agreed scope first, check the affected callers and necessary failure cases, and defer optional cosmetic cleanup. The work is complete only when the agreed behavior and required verification are satisfied.

## Compatibility

| App or component | Support |
| --- | --- |
| Cursor with plugin support | Six skills, matching slash commands, two optional auditors, and the response rule. |
| Codex with plugin support | The same six skills, plus `response-simplicity-setup`. |
| Other Agent Plugins v1 clients | Six portable skills; app-specific integration must be verified for that client. The release installer supports only Cursor and Codex. |
| Release installer and development tools | Node.js 22 or newer. See [installation requirements](installation.md#before-you-start). |
| Optional RTK integration | Native Cursor and version-dependent Codex hook or instruction paths. Verify the installed RTK version and active host runtime after updates; processor checks alone do not certify live compatibility. |

The six shared skills are `efficiency`, `context-optimization`, `rtk-setup`, `rtk-update`, `rtk-filter-design`, and `install-new-release-from-repo`. Broad version compatibility is not certified; release records state the versions actually tested.

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
