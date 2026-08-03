---
name: context-optimization
description: Analyze or improve recurring Cursor context.
---

# Context Optimization

Inspect only the context sources relevant to the user's goal, such as project instructions, Cursor guidance, skills, commands, documentation, and repeated command output. Identify duplicated, obsolete, overly broad, or always-loaded material and the constraints that must survive any reduction.

Follow the user's requested outcome and the active Cursor mode. An analysis request produces recommendations, native planning uses Cursor's plan surface, and an explicit implementation request may update the approved project context. If a material edit is not clearly authorized, ask one focused question before changing it.

Prefer moving specialized guidance behind discoverable skills or scoped references, consolidating repetition, and removing stale instructions. Preserve security, deployment, environment, domain, package, language, and validation requirements.

Measure before and after when practical, validate changed context surfaces proportionally, and report limitations or deviations plainly. The optional efficiency-auditor can provide a second opinion with a context focus when risk or uncertainty warrants it. Do not create custom mode gates, serialized plan wrappers, or a separate approval state machine.
