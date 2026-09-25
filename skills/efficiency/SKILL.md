---
name: efficiency
description: Use when the user asks to review or simplify code or a design, assess task or verification effort, or draft a commit message, pull request text, release notes, or a change summary.
---

# Efficiency

Use this skill when the user asks to review or simplify code or a design, assess task or verification effort, or draft commit messages, pull request descriptions, release notes, or change summaries. Use `context-optimization` for recurring agent instructions and `rtk-setup` or `rtk-filter-design` for RTK work, only when that work is part of the request. Handle simple factual answers, translations, and one-off shorter restatements directly. The always-applied response guidance already carries the short code core and its conditional pointers for ordinary work; this skill adds the explicit review, assessment, and communication branches.

Before writing a user-facing result, read [the human communication contract](references/human-communication.md) once per task, unless it is already loaded.

Load only the branch that matches the request:

- Review or simplification of code or a design, or an in-scope code or design change requested through this skill: read [design and code simplicity](references/design-and-code-simplicity.md), including its scope and result sections. Run its full bounded challenge only when the user explicitly requests a simplicity challenge, review, or simplification, or when the quick pass identifies a material complexity risk.
- Task or verification effort: read [task economy](references/task-economy.md). Add [verification economy](references/verification-economy.md) for choosing, reviewing, or reporting validation; [repeatable-work economy](references/repeatable-work-economy.md) for repeated manual work or an automation choice; [debugging feedback economy](references/debugging-feedback-economy.md) for debugging efficiency, performance regressions, or repeated failed fixes in an authorized coding task; and [RTK evidence interpretation](references/rtk-evidence.md) when RTK history, `rtk gain`, or filtered output informs the assessment.
- Only for commit messages, pull request descriptions, release notes, or change summaries: read [the change communication contract](references/change-communication.md). Project-specific conventions take priority.

The effort and communication branches need no code review, RTK inspection, or design reference.

Treat review, assessment, and analysis requests as read-only. Change code only when the user explicitly asks to change, simplify, or refactor it, and keep the behavior and safety constraints of the design reference unless the user explicitly authorizes a broader change. After authorized edits, run the relevant existing checks. Do not commit, push, or release unless the user separately requests it. Do not replace the user's objective, functional correctness, security review, domain acceptance, project requirements, or the active host's native approvals.

Read [the auditor policy](references/auditor.md) only when the user explicitly requests an independent pass. In Cursor, use the named `efficiency-auditor`. In Codex, delegate the bounded read-only audit only after that explicit request, with the parent model inherited and the auditor policy plus human communication contract as its instructions; add the change communication contract only for that focus. If delegation is unavailable, perform the review in the current agent and label it as not independent. Do not trigger an auditor automatically after implementation.
