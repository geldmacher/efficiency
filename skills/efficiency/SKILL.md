---
name: efficiency
description: Apply evidence-guided simplicity to coding, refactoring, and technical design, with proportionate validation. Also assess task efficiency and prepare commit messages, PR descriptions, release notes, or change summaries.
---

# Efficiency

Use this skill for implementation choices, scoped reviews, task effort, or change communication. For changes to recurring agent instructions, use `context-optimization`; for RTK integration or filters, use `rtk-setup` or `rtk-filter-design` respectively. Select those skills only when that work is part of the request. A communication-only request does not call for a code review, RTK inspection, or the design-and-code reference. Handle simple factual answers, translations, and one-off shorter restatements directly without starting an efficiency assessment.

Before writing a user-facing result, read [the human communication contract](references/human-communication.md).

Only for commit messages, pull request descriptions, release notes, or change summaries, also read [the change communication contract](references/change-communication.md). Project-specific communication conventions take priority.

Infer whether the request concerns task economy, evidence-guided implementation, design simplicity, or code simplicity. For task economy, infer the phase from the request and available evidence. Before work, assess likely cost drivers and output, then recommend the desired economy, the most valuable limits, proportional validation, and actions that deserve explicit attention. During work, identify avoidable context reads, command noise, redundant narration, unnecessary documentation or artifacts, speculative abstractions, delegation, retries, tool calls, or validation effort. After work, assess whether resources and generated output were proportional, identify what materially improved the result, a decision, or necessary verification, and report material under-spending risks or concrete improvements.

Load specialized task-economy guidance only for the matching question. It guides choices within the existing assignment and grants no additional execution or editing authority.

- For choosing, reviewing, or reporting validation of proposed or completed work, read [verification economy](references/verification-economy.md).
- For repeated manual work or an automation choice, read [repeatable-work economy](references/repeatable-work-economy.md).
- For debugging efficiency, performance regressions, or repeated failed fixes in an authorized coding task, read [debugging feedback economy](references/debugging-feedback-economy.md).

When RTK history, `rtk gain`, or filtered output informs an efficiency assessment, read [RTK evidence interpretation](references/rtk-evidence.md). Use relevant available project data, keep execution coverage, shell-output reduction, contributor concentration, and whole-task net effect distinct, and report the evidence scope and host attribution. Do not present cumulative RTK gain as savings from one task or invent monetary cost without user-supplied rates.

Report low value only for a concrete item whose removal or reduction improves the result, a decision, or necessary verification. Explain the evidence and alternative. Length, tone, or an AI-written appearance alone are not findings; preserve material evidence and uncertainty.

For coding, refactoring, or technical design work, read [design and code simplicity](references/design-and-code-simplicity.md) and apply its quick Evidence-Guided Simplicity ladder inside the user's stated objective and approved scope. Run its full bounded challenge only when the user explicitly requests a simplicity challenge, review, or simplification, or when the quick pass identifies a material complexity risk. Apply the quick ladder silently unless it changes the chosen solution, scope, or risk, or the user asks for the reasoning. On an explicit review, also apply the generated-code smell signals in that reference when the change looks agent-generated or unusually large for the requirement. Keep them advisory and scoped.

For design simplicity, use the explicitly supplied design or proposal as the scope. For code simplicity, use an explicitly named scope first. Otherwise inspect the current Git change set: staged changes, unstaged changes, and untracked files reported by Git. If no changes exist or the project is not a Git repository, ask one focused question for the scope instead of expanding to the whole repository. Read nearby definitions, utilities, and conventions only when needed to assess the scoped code; keep findings and edits inside the approved scope.

Treat review, assessment, and analysis requests as read-only. Change code only when the user explicitly asks to change, simplify, or refactor it. For authorized code changes, preserve the behavior and safety constraints in the design and code simplicity reference unless the user explicitly authorizes a broader change. Report a candidate rather than implementing it when behavior preservation is uncertain or the simpler alternative materially broadens the approved scope. After authorized edits, run the relevant existing checks. Do not commit, push, or release unless the user separately requests it.

Check consistent names, cohesive concepts, reuse, derivable state, and redundant parameters. Comments should explain reasons or constraints that code cannot express; use the reference's comment checks to distinguish redundancy from unclear code. Keep code understandable without conversation history. Remove compatibility only when evidence shows that it was never shipped and every affected caller in scope is updated.

For a design or code review, return a concise verdict, material findings with evidence, the root complexity decision when material, practical improvements, required validation, and evidence limitations. Do not replace the user's objective, functional correctness, security review, domain acceptance, project requirements, or the active host's native approvals.

Read [the auditor policy](references/auditor.md) when the user explicitly requests an independent pass. In Cursor, use the named `efficiency-auditor`. In Codex, delegate the bounded read-only audit only after that explicit request, keep the selected parent model through inheritance, and use the auditor policy and human communication contract as the task instructions. Include the change communication contract only when that is the requested focus. If delegation is unavailable, perform the review in the current agent and label it as not independent. Do not trigger an auditor automatically after implementation.
