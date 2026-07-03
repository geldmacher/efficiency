---
name: efficiency-plan
description: Turn a request into a compact cost-aware execution packet before implementation.
---

# Efficiency Plan

Use when a user request should be planned for minimal context waste and RTK-backed execution.

1. Follow the `cost-efficient-execution` skill.
2. Gather only the context needed to remove execution ambiguity.
3. Use targeted reads and `rg` before broad scans.
4. Prefer dry-run commands when they can reveal risk without changing files.
5. Ask before planning if execution-critical information is missing.
6. Produce the cost-aware execution packet.
7. Do not implement the packet while planning it.

The packet should be short enough to execute without re-reading the whole repository.
