# Evidence-Guided Design and Code Simplicity

Use this reference for scoped coding, refactoring, technical design, or design-and-code simplicity work.

## Quick ladder

First establish the required behavior, fixed constraints, and available repository evidence. For a bug-related simplification, trace the affected flow and callers to distinguish a shared cause from a symptom at one call site. Prefer correcting the shared cause within the approved scope; report affected callers outside that scope rather than silently expanding the change. Then stop at the first evidence-supported sufficient option:

1. Omit or delete work that current requirements do not need.
2. Reuse a capability already present in the project.
3. Use the standard library or a native platform capability.
4. Use an already installed dependency only when it lowers total reader, maintenance, and validation burden.
5. Add the smallest local implementation that satisfies the requirement and its necessary quality boundaries.

Apply three operational principles while choosing:

- **YAGNI:** remove speculative requirements, unproved flexibility, and protection for cases the current scope does not require. Missing usage evidence alone does not prove existing behavior is unnecessary; require evidence that removal is safe, including for rarely used error handling and compatibility paths.
- **KISS:** minimize independent concepts, trace depth, hidden or mutable state, and interface burden. Assess the whole affected call chain: shortening one function does not simplify the design if it shifts complexity into callers. Do not use line or file count as a proxy for simplicity.
- **DRY:** keep each piece of knowledge, rule, decision, and validation in one authoritative place. Consolidate when the same domain rule must change together for the same reason; keep rules separate when they can evolve independently. Similar syntax alone does not justify an abstraction when the underlying behavior or lifecycle differs. Distinguish a rule's authoritative definition from its enforcement: preserve necessary checks at each trust boundary even when their logic is similar.

Use the ladder silently unless it changes the selected solution, scope, or material risk, or the user asks for the reasoning. Do not optimize for one-liners, line-count or file-count targets, named intensity modes, or a fixed one-test rule. Preserve user requirements, public interfaces, persisted formats, correctness, security, accessibility, data-loss protection, performance, lifecycle semantics, domain distinctions, project conventions, and proportionate verification.

## Bounded challenge

Run the full challenge only when the user explicitly requests a simplicity challenge, review, or simplification, or when the quick ladder identifies a material complexity risk. If it runs, perform exactly one bounded simplicity challenge after establishing the required behavior, fixed constraints, and available evidence:

1. Name the root decision that creates most variants, branches, states, sources of truth, interface burden, or compatibility handling.
2. Inspect whether complexity is local or repeatedly exposed to callers and maintainers. Assess reader load on two independent axes: the layers someone must trace between a question and its answer, and the hidden or mutable state they must hold in mind. Include everything a caller must know: ordering, invariants, errors, configuration, and performance as well as signatures. Prefer project vocabulary and existing utilities over a new generic design language.
3. Treat a seam or abstraction as justified only when current evidence shows real variation or meaningful behavior behind it. Use the deletion test: if removing it makes complexity disappear, it is likely an unnecessary pass-through; if complexity spreads into callers, it may be earning its place.
4. Before adding a new abstraction or guard, look for demonstrably dead paths, duplicated decisions or validation, empty stubs, and speculative protection that the current requirements do not need. Remove an item only when the supplied scope proves that behavior and every affected caller remain safe.
5. Compare the current design with only the smallest viable alternative. State the difference in observable behavior, risk, validation effort, locality, reader load, and interface burden.
6. Prefer the alternative only when it materially reduces independent concepts without weakening correctness, security, performance, lifecycle semantics, domain distinctions, or project conventions. Otherwise conclude that the current design is already proportionate and explain why.

When state or testing makes a design difficult to follow, prefer the smallest practical state scope, returned results over hidden mutation, and controllable dependencies over construction inside the operation. Test meaningful behavior through the interface used by callers; use internal test seams only when they isolate a real concern. Preserve justified caching, side effects, and lifecycle semantics. A useful boundary can earn its place by hiding meaningful complexity even with one implementation.

For a deliberately limited solution, explain its concrete operating limit and the observed condition that would justify changing it. Keep that rationale near the decision when it is needed for maintenance; do not add speculative upgrade infrastructure or a special comment marker.

When a comment claims an invariant or required constraint, consider whether a type, focused test, lint rule, or boundary check could express it more reliably. Recommend that encoding only when it is simpler, stays inside scope, and runs at the relevant boundary. Keep comments that explain rationale, external constraints, or consequences that code cannot express clearly; never remove a comment merely because an encoding is theoretically possible.

When a comment is flagged, distinguish a redundant comment from a symptom of unclear code. During an authorized change, remove only the former directly. For the latter, recommend or, when authorized, apply the smallest in-scope root-cause clarification; retain any rationale the code still cannot express.

Do not repeat the challenge recursively, enforce this vocabulary over the project's terms, equate fewer lines with better design, or manufacture a finding. Report a candidate rather than implementing it when behavior preservation is uncertain or the alternative expands the approved scope.
