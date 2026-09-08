# RTK Evidence Interpretation

Use this reference whenever RTK history, `rtk gain`, or filtered output is used to assess efficiency or justify a setup or filter decision.

- Treat RTK `Input`, `Output`, `Saved`, and `Save%` as estimates of raw versus filtered shell-output volume. RTK derives the token figures from output size; they are not provider-billed tokens, whole-session input, or task cost.
- Keep four evidence classes distinct:
  - **Execution coverage:** `rtk gain --history` or equivalent host evidence shows that RTK executed for a command.
  - **Shell-output reduction:** RTK estimates how much command output it removed.
  - **Contributor concentration:** absolute estimated reduction and share of the scoped total identify which commands materially contribute. Do not rank usefulness from average percentage alone.
  - **Whole-task net effect:** changes in provider tokens or cost, agent turns, and result quality remain `unverified` without comparable paired observations for the same task, host, model, effort, and relevant environment.
- State whether evidence is global, project, session, or task scoped; cumulative or same-session; and attributable to Cursor, Codex, another host, mixed hosts, or an unknown host. Never attribute mixed or cumulative data to one task or host.
- Keep host truncation, context-cache pricing, commands that bypass RTK, retries, and re-reads outside the measured claim unless direct evidence covers them. A large output reduction may be useful, but it cannot establish whole-task savings by itself.
- For comparative cost claims, distinguish a single paired observation from a repeatable effect. Account for run-to-run variation, repetitions, and failed or excluded runs in both conditions; report failures rather than silently dropping them from the comparison. Use available evidence first and recommend further measurement only for a specific unresolved decision. This guidance does not authorize a benchmark or provider calls.
- When a filter or setup decision is needed, prioritize material absolute contributors and semantic safety. Small or zero reductions are not automatically harmful, and high percentages on rare commands are not automatically valuable.
- Do not persist machine-specific history totals in plugin guidance, fixtures, or product claims. Do not add telemetry or a background benchmark to obtain them.
