# Agent Document Design

Use this reference only when the scoped context includes instructions or documentation consumed by an agent, such as skills, `AGENTS.md`, rules, commands, or documents reached through their links.

## Loading economy

- Distinguish persistent pointers from material loaded only for a matching task. Count the pointer itself as recurring context cost.
- Measure the full text inventory separately from the context loaded for representative tasks. Moving or repeating a rule elsewhere does not by itself establish a saving.
- Require every pointer to identify what it leads to and the distinct task branches that should load it. Collapse synonyms that describe the same branch.
- If necessary guidance is missed, first sharpen the pointer's loading condition and check representative matching and non-matching requests. Inline the guidance only if that placement solves the observed problem better.
- Keep instructions needed by every branch in the main workflow. Put branch-specific policy or detail behind a direct conditional link.
- Keep references one level from the skill that selects them. Do not make an agent traverse an undocumented reference chain.

## Information placement

- Keep ordered actions and their completion conditions easy to find. Do not bury them inside background explanation.
- Co-locate a concept's definition, constraints, and exceptions so one read supplies the complete rule.
- Keep one authoritative location for each meaning. Link to it instead of copying the same instruction into several files.
- Treat scripts, configuration, directory layout, and command help as sources of truth. Restate them only when the lookup is expensive or the document must preserve a rationale, constraint, or non-obvious failure mode.

## Pruning without weakening

- Identify duplicated, obsolete, overly broad, or behavior-neutral instructions with concrete evidence. Do not remove text merely because it is long.
- Before deleting guidance, trace the entrypoints and references that need it. Confirm that the remaining rule is available on every affected loading path, including references read independently.
- Remove history, intensifiers, and restatements only when they do not change a useful decision. Retain rationale needed to understand exceptions or boundaries.
- Prefer stating the required behavior directly. Retain necessary prohibitions as hard guardrails and pair them with the safe target behavior.
- Make completion conditions observable and proportional. Account for every relevant task case, including omissions that a plausible summary could hide. Replace vague outcomes with evidence an agent can actually inspect, but do not invent ceremony or artifacts solely to prove completion. If later steps pull attention away from unfinished work, clarify the current completion condition first. Recommend an additional document or handoff only when observed behavior shows that the separation earns its context and coordination cost.
- Preserve security, deployment, environment, domain, package, language, approval, and validation requirements through every reduction.

For an analysis request, report the affected pointer or document, its recurring or conditional load, the concrete problem, the proposed placement, and what must remain. Edit only after explicit authorization and compare the relevant before-and-after context when practical.
