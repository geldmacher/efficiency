---
name: execute-context-optimization
description: Apply an approved context optimization plan and validate recurring token savings.
---

# Execute Context Optimization

Use the `context-usage-optimizer` skill.

Implement the approved context optimization plan.

Before editing, verify that an approved plan is present and includes target files, exact changes, constraints to preserve, validation commands, and expected savings. If no approved plan is present:

- If usable Context Usage Analysis data is available, create the plan first and stop for approval.
- If no usable Context Usage Analysis data is available, ask for the missing data or an approved plan.

Rules:

- Do not edit unrelated files.
- Do not change MCP, plugin, or global configuration unless explicitly requested.
- Do not remove mandatory project constraints.
- Measure token estimates before and after.
- Run relevant validation.
- Delegate to `context-optimization-reviewer` when always-on safety guidance changed or estimated recurring context reduction exceeds 25%. Review smaller changes inline.
- Report changed files, savings, and validation evidence.
