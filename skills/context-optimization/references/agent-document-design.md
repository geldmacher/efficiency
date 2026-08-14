# Agent Document Design

Use this reference only when the scoped context includes instructions or documentation consumed by an agent, such as skills, `AGENTS.md`, rules, commands, or documents reached through their links.

## Loading economy

- Distinguish persistent pointers from material loaded only for a matching task. Count the pointer itself as recurring context cost.
- Require every pointer to identify what it leads to and the distinct task branches that should load it. Collapse synonyms that describe the same branch.
- Keep instructions needed by every branch in the main workflow. Put branch-specific policy or detail behind a direct conditional link.
- Keep references one level from the skill that selects them. Do not make an agent traverse an undocumented reference chain.

## Information placement

- Keep ordered actions and their completion conditions easy to find. Do not bury them inside background explanation.
- Co-locate a concept's definition, constraints, and exceptions so one read supplies the complete rule.
- Keep one authoritative location for each meaning. Link to it instead of copying the same instruction into several files.
- Treat scripts, configuration, directory layout, and command help as sources of truth. Restate them only when the lookup is expensive or the document must preserve a rationale, constraint, or non-obvious failure mode.

## Pruning without weakening

- Identify duplicated, obsolete, overly broad, or behavior-neutral instructions with concrete evidence. Do not remove text merely because it is long.
- Prefer stating the required behavior directly. Retain necessary prohibitions as hard guardrails and pair them with the safe target behavior.
- Make completion conditions observable and proportional. Replace vague outcomes with evidence an agent can actually inspect, but do not invent ceremony or artifacts solely to prove completion.
- Preserve security, deployment, environment, domain, package, language, approval, and validation requirements through every reduction.

For an analysis request, report the affected pointer or document, its recurring or conditional load, the concrete problem, the proposed placement, and what must remain. Edit only after explicit authorization and compare the relevant before-and-after context when practical.

Source influence: [writing-for-agents at `8b78b531ab965735c5dc74f6f7a219e1e37326df`](https://github.com/mattpocock/skills/blob/8b78b531ab965735c5dc74f6f7a219e1e37326df/skills/productivity/writing-for-agents/SKILL.md). This reference uses original project-specific wording.
