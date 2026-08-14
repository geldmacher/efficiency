# Design and Code Simplicity

Use this reference only for a scoped design-simplicity challenge or code-simplicity review or change.

Perform exactly one bounded simplicity challenge after establishing the required behavior, fixed constraints, and available evidence:

1. Name the root decision that creates most variants, branches, states, sources of truth, interface burden, or compatibility handling.
2. Inspect whether complexity is local or repeatedly exposed to callers and maintainers. Prefer project vocabulary and existing utilities over a new generic design language.
3. Treat a seam or abstraction as justified only when current evidence shows real variation or meaningful behavior behind it. Use the deletion test: if removing it makes complexity disappear, it is likely an unnecessary pass-through; if complexity spreads into callers, it may be earning its place.
4. Compare the current design with only the smallest viable alternative. State the difference in observable behavior, risk, validation effort, locality, and interface burden.
5. Prefer the alternative only when it materially reduces independent concepts without weakening correctness, security, performance, lifecycle semantics, domain distinctions, or project conventions. Otherwise conclude that the current design is already proportionate and explain why.

Do not repeat the challenge recursively, enforce this vocabulary over the project's terms, equate fewer lines with better design, or manufacture a finding. Report a candidate rather than implementing it when behavior preservation is uncertain or the alternative expands the approved scope.

Source influence: [codebase-design at `8b78b531ab965735c5dc74f6f7a219e1e37326df`](https://github.com/mattpocock/skills/blob/8b78b531ab965735c5dc74f6f7a219e1e37326df/skills/engineering/codebase-design/SKILL.md). This reference uses original project-specific wording.
