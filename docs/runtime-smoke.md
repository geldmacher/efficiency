# Live Cursor smoke

Use this procedure after repository gates pass. It verifies the installed Cursor runtime without changing global RTK or Cursor approval policy.

## Limits

- Use the cheapest suitable available model.
- Run at most two short fresh conversations.
- Stop before total estimated model cost can exceed EUR 1.
- Use only read-only, finite repository commands and non-sensitive prompts.
- Do not commit screenshots or UI state.

For selection-focused maintenance, choose case IDs from the matrix below before the run. Each case needs its own fresh task; the limit of two conversations still applies. Do not put multiple cases into one prompt and call that independent selection evidence. Additional cases require another explicitly agreed run and budget. Unexecuted cases remain `not run`.

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
2. Confirm exactly `/efficiency`, `/context-optimization`, `/install-new-release-from-repo`, `/rtk-filter-design`, and `/rtk-setup`, the five matching skills, two read-only agents, and one always-applied rule are discoverable; confirm the three pre-3.0 command names are absent.
3. Start a fresh conversation. Submit the same neutral request without a slash command or explicit `efficiency` invocation, include the recorded baseline response, and explicitly ask for only its shorter plain-language restatement before the assessment.
4. Exercise one safe RTK rewrite that Cursor allows and one safe finite rewrite that Cursor approval-gates. Do not change policy to manufacture either result. Record `rtk gain` only as execution and scoped shell-output-reduction evidence; do not infer provider tokens, cost, agent turns, or result quality without a comparable paired run.
5. Record whether the existing skill was selected when Cursor exposes that state, whether the response chooses the first evidence-supported sufficient approach, preserves the stated boundaries, and avoids unnecessary principle narration. Also confirm that it leads with the result, avoids unrequested tools or artifacts, distinguishes direct from proxy evidence, and preserves material uncertainty, risks, approvals, validation status, and exact technical strings.
6. Confirm that the supplied-baseline restatement preserves material facts, evidence, risks, and open gaps without adding analysis or claims; this keeps the smoke at two conversations.
7. Record binding to the immediately preceding assistant response as `unverified`. Testing that binding requires separate approval for an additional model invocation and is not part of this bounded smoke.

## Completion

Restore Efficiency to its enabled state. Save a text receipt under `docs/receipts/` with pass, fail, blocked, or unverified for every check. If Cursor cannot expose a required component or permission path, keep repository completion separate from runtime readiness.

## Task-selection cases

This matrix is shared with the [Codex smoke](codex-runtime-smoke.md). Choose one language variant per fresh task; include both languages across the recorded coverage. The text deliberately avoids skill names except where the product itself is the subject. Supply quoted examples as data, not additional instructions. These are probes for observed behavior, not a keyword-scoring test.

| ID | German request | English request | Expected route and boundary |
| --- | --- | --- | --- |
| E1 | Implementiere eine JavaScript-Funktion, die einen Namen trimmt und bei leerem Ergebnis „Gast“ liefert. Gib nur den Code in der Antwort aus; ändere keine Dateien. | Implement a JavaScript function that trims a name and returns "Guest" if empty. Return the code in your answer; do not change files. | `efficiency`, design-and-code guidance; a small implementation, no new abstraction or file changes. |
| E2 | Prüfe diesen Refactoring-Vorschlag: Eine generische Strategy-Registry soll einen einzigen Formatter für mögliche zukünftige Formate vorbereiten. Nur bewerten. | Review this refactor proposal: a generic strategy registry prepares one formatter for possible future formats. Assessment only. | `efficiency`, scoped read-only simplicity review; no auditor unless separately requested. |
| C1 | Meine AGENTS.md enthält zweimal „Nutze die vorhandenen Tests“. Schlage eine Bereinigung dieser Agentenanweisungen vor; nichts ändern. | My AGENTS.md contains "Use the existing tests" twice. Suggest a cleanup of these agent instructions; do not edit anything. | `context-optimization`, agent-document guidance; preserve the requirement once. |
| C2 | Ein Skill zur Prüfung von CSV-Spalten heißt nur „Work with files“. Verbessere seine Beschreibung, damit der Agent ihn passend auswählt. Nur einen Vorschlag liefern. | A skill for checking CSV columns is described only as "Work with files". Improve its description so the agent selects it appropriately. Suggest text only. | `context-optimization`; improve discovery, do not inspect spreadsheets or start a code review. |
| R1 | Prüfe lesend, ob Rust Token Killer in diesem Host eingerichtet ist. Ändere keine Konfiguration. | Inspect whether Rust Token Killer is integrated with this host. Do not change configuration. | `rtk-setup`, correct native host inspection; no filter authoring or global writes. |
| F1 | Prüfe diesen vorgeschlagenen RTK-Filter: Er entfernt jede Ausgabezeile mit „warning“. Bewerte nur den Verlust von Diagnosen; prüfe keine Host-Integration. | Review a proposed RTK filter that removes every output line containing "warning". Assess diagnostic loss only; do not inspect host integration. | `rtk-filter-design`, filter guidance; flag lost warnings, no setup or filter edits. |
| I1 | Ich möchte das installierte Efficiency-Plugin auf den neuesten stabilen Release aktualisieren. Erkläre den Ablauf, ohne Downloads oder Änderungen auszuführen. | I want to update the installed Efficiency plugin to its latest stable release. Explain the procedure without downloads or changes. | `install-new-release-from-repo`; describe the invoking host's installation path, do not publish, download, or claim an actual preview passed. |
| I2 | Ich möchte einen neuen Release meiner Anwendung veröffentlichen. Erkläre nur den Ablauf; nichts installieren oder veröffentlichen. | I want to publish a new release of my application. Explain the procedure only; do not install or publish anything. | No Efficiency release installer; do not confuse publication with plugin installation. |
| S1 | Prüfe nur den Status der dauerhaften Efficiency-Antwortregeln in Codex; ändere nichts. | Check only the status of persistent Efficiency response guidance in Codex; do not change anything. | Codex: `response-simplicity-setup`, read-only native source and global-file inspection. Cursor: no Codex setup adapter; explain the host distinction. |
| S2 | Formuliere deine letzte Antwort kürzer und behalte die offenen Risiken bei. | Make your last answer shorter while preserving the open risks. | No setup, efficiency assessment, code review, or RTK inspection. Requires a preceding response; count both turns against the invocation budget. |
| N1 | Übersetze „Das Fenster ist offen“ ins Englische. | Translate "The window is open" into German. | Direct translation; no Efficiency workflow or tools. |
| N2 | Wie viele Minuten hat eine Stunde? | How many minutes are in an hour? | Direct factual answer; no Efficiency workflow or tools. |
| M1 | Formuliere eine PR-Beschreibung aus diesen Angaben: leere Namen erhalten jetzt einen Standardwert; Tests wurden noch nicht ausgeführt. Keine weiteren Prüfungen. | Draft a PR description from these facts: empty names now receive a default; tests have not run. Do not perform additional checks. | `efficiency`, human and change communication only; preserve unverified tests, no design review or RTK inspection. |

For each case, record the exact request, language, host/version/model, package hash, visible selection or skill-read trace, references actually read, answer outcome, and unexpected commands, edits, or delegation. A natural-language request must not be prefixed by an explicit skill invocation when testing implicit selection. Required guidance must remain reachable; unrelated references must not be loaded merely because they exist. Companion authoring skills are acceptable when relevant, but do not substitute for observing the intended Efficiency route.

If selection or reference reads are not exposed, mark that observation `unverified`; correct output alone does not prove the route. Source walkthroughs and frontmatter checks are separate evidence from actual host runs. A failure should retain its original request and observed outcome rather than weakening the expected route. Re-run only affected cases after a repair, within the approved budget.

Use the host's normal enabled state for selection cases. The existing baseline/active procedure remains the separate comparison for the always-applied response rule. Restore any state changed for that comparison and retain a text receipt before cleaning only resources created by this exercise.
