---
name: response-simplicity-setup
description: Preview, install, update, or remove the optional global Efficiency response-simplicity guidance for Codex.
---

# Response Simplicity Setup

Read [the canonical response guidance](references/response-simplicity.md). Use this skill only for Codex global guidance; Cursor loads the equivalent rule directly.

Resolve the active Codex home from the current environment, defaulting to `~/.codex`. If a non-empty `AGENTS.override.md` exists there, it is the active global file. Otherwise use `AGENTS.md`. Read the complete active file before proposing a change and preserve all existing content, including RTK imports.

Manage exactly one block delimited by these markers:

```text
<!-- geldmacher-efficiency:response-simplicity:start -->
<!-- geldmacher-efficiency:response-simplicity:end -->
```

For status or analysis, remain read-only. For installation or update, place the canonical guidance between the markers. Replace an existing well-formed block instead of adding another one. If markers are missing, duplicated, malformed, or equivalent unmarked guidance already exists, stop and explain the conflict instead of guessing or duplicating content.

Before installing, updating, or removing the block, show the exact diff and wait for explicit user approval. Plugin installation does not authorize this global edit. After approval, apply only that patch, re-read the complete file, and verify that unrelated content is unchanged. Removal deletes only the marked block; do not rewrite or normalize surrounding content.

Tell the user to start a new Codex task after a successful change because Codex loads global `AGENTS.md` guidance when a task starts. Report repository validation, global guidance activation, and fresh-task runtime observation as separate evidence.
