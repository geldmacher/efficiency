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

Use the same neutral request in both conversations:

> Inspect this small Cursor plugin using the available repository evidence. Run `git status --short` and one additional safe finite command when useful. Lead with the overall assessment, then report only material risks, uncertainty, and validation status.

## Baseline conversation

1. Temporarily disable the Efficiency plugin or its rule through Cursor's normal UI.
2. Start a fresh conversation and submit the neutral request without a slash command.
3. Record the model, visible rule state, command permission outcomes, RTK history evidence, and response characteristics.

## Active conversation

1. Enable Efficiency again and reload Cursor.
2. Confirm four commands, four skills, two read-only agents, and one always-applied rule are discoverable.
3. Start a fresh conversation and submit the neutral request through `/efficiency`.
4. Exercise one safe RTK rewrite that Cursor allows and one safe finite rewrite that Cursor approval-gates. Do not change policy to manufacture either result.
5. Record whether the response leads with the result, avoids redundant restatement and unrequested artifacts, and preserves material evidence, uncertainty, risks, approvals, validation status, and exact technical strings. If it reports low-value output, confirm that it names the concrete item, missing material benefit, and practical adjustment rather than judging length, tone, or whether language appears AI-written.

## Completion

Restore Efficiency to its enabled state. Save a text receipt under `docs/receipts/` with pass, fail, blocked, or unverified for every check. If Cursor cannot expose a required component or permission path, keep repository completion separate from runtime readiness.
