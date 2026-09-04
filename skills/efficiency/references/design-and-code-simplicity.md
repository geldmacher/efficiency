# Evidence-Guided Design and Code Simplicity

Use this reference for scoped coding, refactoring, technical design, or design-and-code simplicity work.

## Quick ladder

First establish the required behavior, fixed constraints, and available repository evidence. Then stop at the first evidence-supported sufficient option:

1. Omit or delete work that current requirements do not need.
2. Reuse a capability already present in the project.
3. Use the standard library or a native platform capability.
4. Use an already installed dependency only when it lowers total reader, maintenance, and validation burden.
5. Add the smallest local implementation that satisfies the requirement and its necessary quality boundaries.

Apply three operational principles while choosing:

- **YAGNI:** remove speculative requirements, unproved flexibility, and protection for cases the current scope does not require.
- **KISS:** minimize independent concepts, trace depth, hidden or mutable state, and interface burden. Do not use line or file count as a proxy for simplicity.
- **DRY:** keep each piece of knowledge, rule, decision, and validation in one authoritative place. Similar syntax alone does not justify an abstraction when the underlying behavior or lifecycle differs.

Use the ladder silently unless it changes the selected solution, scope, or material risk, or the user asks for the reasoning. Do not optimize for one-liners, line-count or file-count targets, named intensity modes, or a fixed one-test rule. Preserve user requirements, public interfaces, persisted formats, correctness, security, accessibility, data-loss protection, performance, lifecycle semantics, domain distinctions, project conventions, and proportionate verification.

## Bounded challenge

Run the full challenge only when the user explicitly requests a simplicity challenge, review, or simplification, or when the quick ladder identifies a material complexity risk. If it runs, perform exactly one bounded simplicity challenge after establishing the required behavior, fixed constraints, and available evidence:

1. Name the root decision that creates most variants, branches, states, sources of truth, interface burden, or compatibility handling.
2. Inspect whether complexity is local or repeatedly exposed to callers and maintainers. Assess reader load on two independent axes: the layers someone must trace between a question and its answer, and the hidden or mutable state they must hold in mind. Prefer project vocabulary and existing utilities over a new generic design language.
3. Treat a seam or abstraction as justified only when current evidence shows real variation or meaningful behavior behind it. Use the deletion test: if removing it makes complexity disappear, it is likely an unnecessary pass-through; if complexity spreads into callers, it may be earning its place.
4. Before adding a new abstraction or guard, look for demonstrably dead paths, duplicated decisions or validation, empty stubs, and speculative protection that the current requirements do not need. Remove an item only when the supplied scope proves that behavior and every affected caller remain safe.
5. Compare the current design with only the smallest viable alternative. State the difference in observable behavior, risk, validation effort, locality, reader load, and interface burden.
6. Prefer the alternative only when it materially reduces independent concepts without weakening correctness, security, performance, lifecycle semantics, domain distinctions, or project conventions. Otherwise conclude that the current design is already proportionate and explain why.

When a comment claims an invariant or required constraint, consider whether a type, focused test, lint rule, or boundary check could express it more reliably. Recommend that encoding only when it is simpler, stays inside scope, and runs at the relevant boundary. Keep comments that explain rationale, external constraints, or consequences that code cannot express clearly; never remove a comment merely because an encoding is theoretically possible.

When a comment is flagged, distinguish a redundant comment from a symptom of unclear code. During an authorized change, remove only the former directly. For the latter, recommend or, when authorized, apply the smallest in-scope root-cause clarification; retain any rationale the code still cannot express.

Do not repeat the challenge recursively, enforce this vocabulary over the project's terms, equate fewer lines with better design, or manufacture a finding. Report a candidate rather than implementing it when behavior preservation is uncertain or the alternative expands the approved scope.

Source influence: the MIT-licensed [Ponytail v4.9.0 guidance](https://github.com/DietrichGebert/ponytail/blob/v4.9.0/AGENTS.md) and [Ponytail review skill](https://github.com/DietrichGebert/ponytail/blob/v4.9.0/skills/ponytail-review/SKILL.md) at commit `0a4dd63`, [codebase-design at `8b78b531ab965735c5dc74f6f7a219e1e37326df`](https://github.com/mattpocock/skills/blob/8b78b531ab965735c5dc74f6f7a219e1e37326df/skills/engineering/codebase-design/SKILL.md), plus pstack's [minimize-reader-load](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/principle-minimize-reader-load/SKILL.md), [subtract-before-you-add](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/principle-subtract-before-you-add/SKILL.md), and [no-comments](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/no-comments/SKILL.md) at `bdf7aa355337897f167153e05069aca505dae17c`. Efficiency adapts the ordered solution ladder in original project-specific wording; it does not adopt Ponytail's one-liner priority, line-count metric, intensity modes, or fixed one-test rule.
