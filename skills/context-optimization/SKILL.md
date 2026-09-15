---
name: context-optimization
description: Optimize agent context in AGENTS.md, rules, skills, commands, and repeated tool output. Improve skill selection, remove duplication, and reduce unnecessary context loading while preserving required guidance.
---

# Context Optimization

Use this skill when the request concerns the context sources themselves, including skill descriptions and loading conditions. Use `efficiency` for overall task effort or code simplicity. A request to shorten one human-facing answer does not require a context audit.

Before writing a user-facing result, read [the human communication contract](../efficiency/references/human-communication.md). Identify the affected context sources.

Inspect only the context sources relevant to the user's goal. In Cursor, these can include project instructions, rules, commands, skills, and mode guidance. In Codex, these can include global and project `AGENTS.md`, project `.codex/config.toml`, plugins, skills, and repeated command output. In another Agent Plugins client, inspect only context and configuration surfaces documented by that host; do not infer Cursor or Codex paths. Include documentation only when it actually contributes recurring context. Identify duplicated, obsolete, overly broad, or always-loaded material and the constraints that must survive any reduction.

When the scoped context includes skills, `AGENTS.md`, rules, commands, or another document consumed by an agent, read [agent document design](references/agent-document-design.md). Use it to assess pointer quality, persistent versus conditional load, information placement, stale repository-fact caches, and completion criteria. Do not load that reference for ordinary human-facing documentation that does not affect agent context.

Follow the user's requested outcome and the active host mode. An analysis request produces recommendations, native planning uses the host's plan surface, and an explicit implementation request may update only the approved context. If a material edit is not clearly authorized, ask one focused question before changing it.

Prefer moving specialized guidance behind discoverable skills or scoped references, consolidating repetition, and removing stale instructions. Preserve security, deployment, environment, domain, package, language, and validation requirements.

Measure before and after when practical, validate changed context surfaces proportionally, and report limitations or deviations plainly. When the user explicitly requests an independent context pass, follow [the efficiency auditor policy](../efficiency/references/auditor.md) and the host-specific delegation boundary in the `efficiency` skill. Do not create custom mode gates, serialized plan wrappers, or a separate approval state machine.
