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

### Generated-code smell signals

During an explicit simplicity review or when the quick ladder identifies material complexity risk, also scan the approved scope for these signals. Treat them as evidence cues, not numeric gates. Report a finding only with a concrete location and a safer in-scope alternative; do not invent thresholds or run specialized metric tools unless the project already exposes them.

1. **Branching load:** nested conditionals, large switch/if cascades, or many early exits that force a reader to hold several paths at once. Prefer extracting the shared decision or collapsing dead branches over counting cyclomatic or cognitive complexity scores.
2. **File cohesion:** a file that mixes unrelated responsibilities or keeps growing around one hotspot. Prefer splitting by responsibility or moving helpers next to their callers. Do not treat a line-count ceiling as a simplicity target.
3. **Dead or redundant surface:** unused exports, empty stubs, copy-pasted blocks with renamed identifiers, pass-through wrappers that add no behavior. Remove only when every in-scope caller and required public surface stay safe.
4. **Type and error escape hatches:** new `any` / unbounded `unknown`, empty `catch`, or log-and-continue that hides failures. Prefer a precise type, a narrowed unknown, or an explicit error path at the trust boundary.
5. **Weak verification theater:** tests that mirror implementation structure, assert only mocks, or add coverage without a caller-visible contract. Prefer one check that would fail on a real defect over more lines of coverage. When tests are in scope, apply the test-surface cues. Do not recommend 100% coverage, mutation score zero, CRAP, or Halstead metrics unless the repository already uses those tools and the risk warrants them.

5. Compare the current design with only the smallest viable alternative. State the difference in observable behavior, risk, validation effort, locality, reader load, and interface burden.
6. Prefer the alternative only when it materially reduces independent concepts without weakening correctness, security, performance, lifecycle semantics, domain distinctions, or project conventions. Otherwise conclude that the current design is already proportionate and explain why.

When state or testing makes a design difficult to follow, prefer the smallest practical state scope, returned results over hidden mutation, and controllable dependencies over construction inside the operation. Preserve justified caching, side effects, and lifecycle semantics. A useful boundary can earn its place by hiding meaningful complexity even with one implementation.

Test meaningful behavior through the interface used by callers; use internal test seams only when they isolate a real concern. Derive expectations from requirements, independent examples, or domain invariants, not from the implementation under test. Ask which concrete, relevant defect would make the test fail. Return values, side effects, errors, and justified absence are valid observations. Property tests, type checks, configuration contracts, and content contracts can protect meaningful requirements too. Improve a weak test to observe its intended contract; recommend removal only with evidence of redundancy or no contract value.

For a deliberately limited solution, explain its concrete operating limit and the observed condition that would justify changing it. Keep that rationale near the decision when it is needed for maintenance; do not add speculative upgrade infrastructure or a special comment marker.

When a comment claims an invariant or required constraint, consider whether a type, focused test, lint rule, or boundary check could express it more reliably. Recommend that encoding only when it is simpler, stays inside scope, and runs at the relevant boundary. Keep comments that explain rationale, external constraints, or consequences that code cannot express clearly; never remove a comment merely because an encoding is theoretically possible.

When a comment is flagged, distinguish a redundant comment from a symptom of unclear code. During an authorized change, remove only the former directly. For the latter, recommend or, when authorized, apply the smallest in-scope root-cause clarification; retain any rationale the code still cannot express.

Do not repeat the challenge recursively, enforce this vocabulary over the project's terms, equate fewer lines with better design, or manufacture a finding. Report a candidate rather than implementing it when behavior preservation is uncertain or the alternative expands the approved scope.

### Test surface

When an authorized change adds or changes tests, or an explicit simplicity review includes tests, use the questions and cues below. They are evidence cues. A review reports a concrete location and a safer in-scope alternative. This subsection does not authorize creating, running, or deleting tests outside the approved scope.

Before adding or changing a test, answer four questions. A missing answer means do not add that test yet:

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Prefer one primary owner at the strongest boundary. Another layer needs its own distinct risk. Prefer extending a table-driven case or shared fixture over a near-duplicate.
4. Does it need a production seam (export, flag, wrapper, or injection hook) that no production caller needs? If it does, move the test to the real boundary instead.

These patterns are evidence cues. A match still needs a concrete location; the pattern alone does not prove the test should be removed:

- assertion-free coverage probes
- self-comparisons and identity copies
- exact source, import, or string searches of the implementation
- private predicate or call-shape tests duplicated at a real boundary
- duplicate invocations of the same contract across layers without a distinct risk
- tests whose only purpose is preserving test-only exports, globals, or wrappers
- expected values produced by the helper or renderer under test
- mocks that implement the asserted behavior
- negative controls that pass for an unrelated reason

Optimize for confidence, not for how many tests are removed. A new test that must change under behavior-preserving refactoring is suspect; rewrite it at the owning boundary before adding it. An existing test with that shape is not automatically removable. Recommend removal only with evidence of redundancy or no contract value, and prefer improving a weak test so it observes the contract it was meant to protect.
