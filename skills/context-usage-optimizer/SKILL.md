---
name: context-usage-optimizer
description: Plan or apply reductions from Cursor Context Usage Analysis data.
---

# Context Usage Optimizer

## Goal

Reduce recurring Cursor context usage without removing mandatory project constraints, safety rules, or discoverability.

## Inputs

Accept one of:

- Cursor context usage canvas `.canvas.tsx`
- Sibling `.canvas.data.json`
- Pasted Context Usage Analysis summary
- User-provided token breakdown by category

If the user gives a `.canvas.tsx`, look for a sibling `.canvas.data.json`. If the data is unavailable, ask for it instead of guessing.

## Insufficient Input

If there is no usable Context Usage Analysis data and no approved optimization plan, stop and ask for one of the accepted inputs. Do not infer recurring context drivers from repository size, current chat length, or generic best practices.

For execution requests:

- If an approved plan is provided, implement only that plan.
- If usable Context Usage Analysis data is provided but no approved plan exists, produce a plan first and stop for approval.
- If neither data nor an approved plan is provided, ask for the missing data or approved plan before editing.

## Classification

Classify findings into:

1. Conversation history
   - Usually not a repo edit.
   - Recommend a fresh chat with a compact handoff.
2. Always-loaded repo guidance
   - `AGENTS.md`
   - `.cursor/rules/**`
   - `.agents/rules/**`
   - Project entry docs
   - Best durable optimization target.
3. Skills
   - Large or broad skills should use `disable-model-invocation: true`.
   - Move examples and reference material into progressive-disclosure files.
4. MCPs and plugins
   - Usually workspace or user configuration.
   - Do not disable without explicit user approval.
5. Tool-call history
   - Usually process guidance.
   - Recommend batching edits, using patches or scripts, and avoiding large generated artifacts in chat.

## Plan Mode Behavior

When Plan Mode is active:

1. Do not edit files.
2. Measure baseline tokens for target files with `len(text) / 4` unless a better tokenizer is available.
3. Identify concrete target files.
4. Create a plan with target files, exact cuts or relocations, constraints to preserve, validation commands, estimated token savings, and escalation triggers.
5. Do not suggest removing mandatory safety, security, deployment, environment, logging, or domain-boundary rules unless a better always-available location is named.

## Agent Mode Behavior

When Agent Mode is active and the user asks to implement:

1. Stage no unrelated changes.
2. Edit only approved files.
3. Preserve mandatory constraints:
   - security and secrets handling
   - deployment and environment approval gates
   - DDEV-first commands
   - domain or package boundaries
   - log-access boundaries
   - language-contract requirements
4. Prefer compression and linking over deletion.
5. After edits, measure before and after token estimates.
6. Run the cheapest relevant validation:
   - plugin or control-plane audit if agent assets changed
   - docs link checks if docs changed
   - project-specific gates only when runtime behavior changed
7. Delegate to `context-optimization-reviewer` when always-on safety guidance changed or estimated recurring context reduction exceeds 25%. Otherwise review inline.

## Output Format

For analysis-only output:

- Biggest driver
- Durable repo opportunities
- Non-repo opportunities
- Recommended plan
- Estimated savings
- Risks

For implementation output:

- Changed files
- Before and after token estimates
- Validation evidence
- Known skipped checks and why
