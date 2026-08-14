# Debugging Feedback Economy

Use this reference only to assess or adjust the efficiency of debugging a failure or performance regression. It does not turn an efficiency request into authorization to diagnose or fix the problem.

- Identify the exact observed symptom and the evidence already available.
- Check whether one finite feedback loop can reproduce that symptom specifically. Prefer the lowest-cost adequate seam, such as an existing focused test or a bounded CLI fixture.
- Judge the loop by signal, speed, determinism, safety, and whether it can run without hidden manual steps. A broad check that only proves the system did not crash is not symptom-specific evidence.
- Recommend minimizing the reproducer before expanding the hypothesis set or adding instrumentation. Remove one input, dependency, configuration, or step at a time while retaining the symptom.
- For performance work, recommend a measured baseline before a proposed optimization.
- If no safe loop is available, state the evidence gap and the precise access, redacted artifact, or separate permission that would unblock it.
- Keep credentials, authentication material, personal data, and sensitive payloads out of commands, fixtures, and reported output. Use redacted excerpts when the full artifact is unnecessary.

This guidance may recommend a next step. It does not authorize creating tests, starting servers, instrumenting production, changing code, dispatching agents, or persisting debugging artifacts. Those actions require their own task scope and approval.

Source influence: [diagnosing-bugs at `8b78b531ab965735c5dc74f6f7a219e1e37326df`](https://github.com/mattpocock/skills/blob/8b78b531ab965735c5dc74f6f7a219e1e37326df/skills/engineering/diagnosing-bugs/SKILL.md). This reference uses original project-specific wording.
