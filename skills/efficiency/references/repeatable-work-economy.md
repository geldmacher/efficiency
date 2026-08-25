# Repeatable-Work Economy

Use this reference only when task economy concerns repeated manual work or whether a reusable tool would be proportionate.

- Compare the number and similarity of units, likely reruns, consistency risk, reuse, and reviewer-verification benefit with the cost to build, check, maintain, and eventually remove the tool.
- Prefer direct work for a few obvious, easily reviewed changes. Do not build infrastructure merely because automation is possible.
- Prefer a deterministic tool when material repetition, drift risk, reuse, or rerunnable verification clearly repays its cost. The tool should be narrowly scoped, fail visibly, preserve protected paths, and be safe to rerun.
- When the recipe is uncertain, recommend learning it on one representative unit before designing the tool. This is a recommendation, not authority to perform either step.
- For identical mechanical transformations, prefer one deterministic tool over delegating the same manual recipe. Delegation may still be justified for genuinely different slices or independent judgment.
- Count the tool, fixtures, instructions, generated output, and cleanup as part of the task cost. Persist only artifacts that materially improve repeatability, a decision, or necessary verification.

This guidance compares approaches. It does not authorize creating or running tests, checks, scripts, or tools; changing files; generating or persisting artifacts; dispatching agents; starting servers; deploying; accessing live systems; or broadening the approved scope.

Source influence: [build-the-lever at `bdf7aa355337897f167153e05069aca505dae17c`](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/principle-build-the-lever/SKILL.md). This reference uses original project-specific wording.
