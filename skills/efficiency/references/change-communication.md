# Change Communication

Use this guidance only for commit messages, pull request descriptions, release notes, and change summaries. Follow the project's own communication conventions first.

Identify whether the intended reader must act, decide, or understand. Use exact project terms and symbols, put applicable conditions before requested actions, and present the common path before exceptions. Keep reviewer actions separate from rationale so neither is buried. This contract does not extend the workflow to tutorials, READMEs, RFCs, or general documentation.

## Commit messages

- Make the subject concrete, capitalized, imperative, and free of a final period.
- Aim for about 50 characters. Treat 72 characters as a fallback upper bound, not a reason to remove essential meaning.
- Separate an optional body from the subject with a blank line.
- Use the body to explain the problem and rationale, non-obvious behavior, trade-offs, side effects, validation, or limitations. Do not merely narrate the diff.

## Pull requests, release notes, and change summaries

- Start with the outcome and scope.
- Add the rationale, supporting evidence, risks or open gaps, and the next review action when useful.
- Make every material claim traceable to a diff, check, other evidence, or a clearly labelled assumption.
- Keep verified behavior, intended behavior, and open work distinct.

Do not score style, assess whether text appears AI-written, or trade necessary evidence for brevity.

Source influence: [technical-writing at `bdf7aa355337897f167153e05069aca505dae17c`](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/technical-writing/SKILL.md). This reference uses original project-specific wording.
