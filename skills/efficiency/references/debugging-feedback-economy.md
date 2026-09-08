# Debugging Feedback Economy

Use this reference only to assess or adjust the efficiency of debugging a failure or performance regression. It does not turn an efficiency request into authorization to diagnose or fix the problem.

- Identify the exact observed symptom and the evidence already available.
- Check whether one finite feedback loop can reproduce that symptom specifically. Prefer the lowest-cost adequate seam, such as an existing focused test or a bounded CLI fixture.
- Judge the loop by signal, speed, determinism, safety, and whether it can run without hidden manual steps. A broad check that only proves the system did not crash is not symptom-specific evidence.
- Recommend minimizing the reproducer before expanding the hypothesis set or adding instrumentation. Remove one input, dependency, configuration, or step at a time while retaining the symptom.
- For intermittent failures, assess reproduction frequency and observation conditions rather than treating one passing run as a fix. Recommend bounded repetitions or controlled timing and input variation only when they improve the signal; avoid an arbitrary run count.
- Compare plausible hypotheses using a falsifiable prediction for each and the cheapest observation that distinguishes them. Recommend changing one relevant variable at a time and targeting instrumentation at that prediction. Revise the hypotheses when evidence contradicts them rather than repeating an unchanged probe.
- For performance work, recommend a measured baseline before a proposed optimization.
- When assessing a completed correction, require evidence from the original scenario as well as an appropriate regression check at a seam that exercises the actual failure pattern. A test of one caller is insufficient for a failure that requires several callers. If no suitable seam exists, report the verification gap. Check that temporary instrumentation and throwaway harnesses were removed, or that any retained artifact has a stated ongoing purpose.
- If no safe loop is available, state the evidence gap and the precise access, redacted artifact, or separate permission that would unblock it.
- Keep credentials, authentication material, personal data, and sensitive payloads out of commands, fixtures, and reported output. Use redacted excerpts when the full artifact is unnecessary.

This guidance may recommend a next step. It does not authorize creating tests, starting servers, instrumenting production, changing code, dispatching agents, or persisting debugging artifacts. Those actions require their own task scope and approval.
