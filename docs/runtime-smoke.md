# Live Cursor smoke

Use this procedure after repository gates pass. It verifies the installed Cursor runtime without changing global RTK or Cursor approval policy.

## Limits

- Use the cheapest suitable available model.
- Run at most two short fresh conversations.
- Stop before total estimated model cost can exceed EUR 1.
- Use only read-only, finite repository commands and non-sensitive prompts.
- Do not commit screenshots or UI state.

## Evidence before the UI run

Record the baseline commit, working-tree status, Cursor, RTK, Node.js, and platform versions. Record SHA-256 hashes for `.cursor-plugin/plugin.json`, every command, skill, agent, and rule file.

Use the same core request in both conversations. It is deliberately phrased as a natural design request without a slash command or explicit `efficiency` invocation. The active conversation supplies the recorded baseline response only to check content-preserving restatement within the existing budget; because it is not the immediately preceding assistant response, this does not prove last-response binding:

> Review this proposed refactor: add a generic strategy registry so one existing formatter can support possible future formats. Recommend the first sufficient safe approach justified by current requirements and repository evidence. Preserve public behavior, security, accessibility, and necessary validation. Explain the simplicity choice only if it changes the solution or risk.

## Baseline conversation

1. Temporarily disable the Efficiency plugin or its rule through Cursor's normal UI.
2. Start a fresh conversation and submit the neutral request without a slash command.
3. Record the model, visible rule state, command permission outcomes, RTK history evidence, and response characteristics.

## Active conversation

1. Enable Efficiency again and reload Cursor.
2. Confirm exactly `/efficiency`, `/context-optimization`, `/rtk-filter-design`, and `/rtk-setup`, the four matching skills, two read-only agents, and one always-applied rule are discoverable; confirm the three pre-3.0 command names are absent.
3. Start a fresh conversation. Submit the same neutral request without a slash command or explicit `efficiency` invocation, include the recorded baseline response, and explicitly ask for only its shorter plain-language restatement before the assessment.
4. Exercise one safe RTK rewrite that Cursor allows and one safe finite rewrite that Cursor approval-gates. Do not change policy to manufacture either result. Record `rtk gain` only as execution and scoped shell-output-reduction evidence; do not infer provider tokens, cost, agent turns, or result quality without a comparable paired run.
5. Record whether the existing skill was selected when Cursor exposes that state, whether the response chooses the first evidence-supported sufficient approach, preserves the stated boundaries, and avoids unnecessary principle narration. Also confirm that it leads with the result, avoids unrequested tools or artifacts, distinguishes direct from proxy evidence, and preserves material uncertainty, risks, approvals, validation status, and exact technical strings.
6. Confirm that the supplied-baseline restatement preserves material facts, evidence, risks, and open gaps without adding analysis or claims; this keeps the smoke at two conversations.
7. Record binding to the immediately preceding assistant response as `unverified`. Testing that binding requires separate approval for an additional model invocation and is not part of this bounded smoke.

## Completion

Restore Efficiency to its enabled state. Save a text receipt under `docs/receipts/` with pass, fail, blocked, or unverified for every check. If Cursor cannot expose a required component or permission path, keep repository completion separate from runtime readiness.
