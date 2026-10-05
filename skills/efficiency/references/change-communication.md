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

For a pull request or change summary, add any of these when it helps the reader decide faster than the prose already required above. Skip an item when it would repeat that prose, guess at an unknown fact, or crowd the decision.

- When a short diff, a shallow tree, or a compact before/after sketch shows the change faster than prose, include the smallest one beside the point it supports.
- When behavior changes, show the observed before and after: the check, command output, or screenshot that demonstrates it. Call a side unverified when it was not observed.
- For a pull request, name the door and the blast radius when they affect the merge. A two-way door is straightforward to revert. A one-way door is hard to undo, such as a destructive data change or a published contract. The blast radius is who or what a bad merge would affect. A few words are enough unless that consequence is not obvious.

Do not score style, assess whether text appears AI-written, or trade necessary evidence for brevity.
