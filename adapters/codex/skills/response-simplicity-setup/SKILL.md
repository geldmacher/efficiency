---
name: response-simplicity-setup
description: Check, preview, configure, or remove Efficiency's persistent response and code-change guidance in Codex's global AGENTS.md. Use for lasting preferences, not a one-off shorter answer.
---

# Response Simplicity Setup

Read [the canonical response guidance](references/response-simplicity.md). Use this skill only for persistent Codex guidance; Cursor loads the equivalent rule directly. Handle a one-off shorter answer without this setup. Status and preview requests are read-only.

Resolve the active Codex home from the current environment, defaulting to `~/.codex`. If a non-empty `AGENTS.override.md` exists there, it is the active global file. Otherwise use `AGENTS.md`. Read the complete active file before proposing a change and preserve all existing content, including RTK imports. An absent global file is a valid first-installation state; create it only as part of an approved patch.

## Resolve the installed guidance

For status, preview, installation, or update, inspect `codex plugin list --json`. Select the single installed `geldmacher-efficiency` entry and its native `source.path` with `source.source` equal to `local`. Require an absolute, existing stable installation source, its `.codex-plugin/plugin.json` with the expected plugin identity, and its root `AGENTS.md` matching the bundled canonical response guidance. Resolve filesystem aliases before comparing paths. Reject versioned cache directories, `.build` outputs, temporary directories, development checkouts, and ambiguous or conflicting sources. Do not invent a path from the skill's cache location or select the newest cache by filename. If native inspection or a stable source is unavailable, report the missing prerequisite and make no configuration change.

Compare the source manifest version and response text with this skill's installed package. If they differ, report a stale or mismatched installation and require a fresh task with matching installed bytes before configuration. Do not reinstall the plugin as part of setup.

The Codex bundle's root `AGENTS.md` contains only the response guidance. Its presence in a plugin does not make Codex discover it globally. The setup therefore adds an explicit read instruction to the active global file; it does not rely on an automatic `@path` import.

## Manage the reference

Manage exactly one block delimited by these markers:

```text
<!-- geldmacher-efficiency:response-simplicity:start -->
<!-- geldmacher-efficiency:response-simplicity:end -->
```

Between the markers, write one sentence: `Before your first user-facing response in each task, read and follow` followed by an absolute Markdown link labelled `Efficiency response guidance`, then a period. The link targets the verified stable source's root `AGENTS.md`; enclose the absolute path in angle brackets and URI-encode characters that would break Markdown. Do not inline the response rules or point at other skills. This is one read per task, not per response; reuse guidance already loaded in that task.

- With neither marker present and no equivalent unmarked guidance, append a new block for an approved installation.
- With one correctly ordered marker pair, replace only its contents. An exact canonical inline body is the supported legacy form and migrates to the reference on an approved update. An exact inline copy of the canonical text without its `Code changes` section is the same legacy form. An unchanged generated reference is a no-op, with no file write or new approval request.
- If a marker is unpaired, duplicated, malformed, the managed body has user changes, or equivalent unmarked guidance already exists, stop and explain the conflict instead of guessing or duplicating content. Preserve all user changes. Do not silently retarget a reference to a different installation source.
- For status, distinguish absent configuration, a legacy inline block, an intact reference, a missing or changed target, and a conflict. A reference to a missing target is broken, not active guidance.
- Removal deletes only the marked block. A recognized generated reference can be removed even when its target is missing or native plugin inspection is unavailable. Removal with no block is a no-op. Unknown or modified block contents still require the user to resolve the conflict.

Before installing, updating, or removing the block, show the exact diff and wait for explicit user approval unless that exact change has already been approved in the current assignment. Plugin installation does not authorize this global edit. Immediately before applying the approved patch, re-read the file; if it changed, prepare a fresh diff instead of overwriting concurrent edits. Apply only that patch, re-read the complete file, and verify the reference and preservation of unrelated content. Do not rewrite or normalize surrounding content.

The reference follows plugin updates at the same stable source path without another global edit. It is independent of plugin enablement and remains configured until removed; disablement does not remove global guidance, and deleting its target can leave a broken reference. Explain this when proposing installation. Report a broken target during setup without blocking unrelated user work or substituting another cached copy.

Tell the user to start a new Codex task after a successful change because Codex loads global `AGENTS.md` guidance when a task starts. A no-op needs no new task solely for this setup. Report verified file configuration, fresh-task reference loading, and observed response behavior separately; configuration alone does not prove runtime activation.
