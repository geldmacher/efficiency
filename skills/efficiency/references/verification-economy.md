# Verification Economy

Use this reference only when task economy concerns choosing, reviewing, or reporting validation for proposed or completed work. Use [debugging feedback economy](debugging-feedback-economy.md) instead when the goal is to make an investigation loop efficient.

- Name the behavior or artifact that must hold, then identify at most two facts on which the material risk depends. Do not expand into a general risk inventory.
- For each fact, choose the cheapest adequate direct observation. Source inspection can support a claim; a focused check that runs the relevant code is stronger; a live path is necessary only when the risk depends on host or runtime behavior.
- Treat builds, summaries, caches, timestamps, generated reports, and derived state as proxies unless the risk actually lives there. Do not upgrade proxy evidence into direct or live evidence.
- For an integration, trace and check the risk-bearing input-to-output path only as far as needed. State where direct observation stopped and what remains unverified.
- Split multi-step work into smaller verifiable units only when doing so materially improves failure isolation, rollback, or reviewer confidence. End each chosen unit with observable evidence; do not create commits or ceremony solely to appear incremental.
- Keep intended behavior, source-supported behavior, executed checks, and live observation distinct in the result. If an adequate direct check is unavailable, name the gap and the exact permission, artifact, or environment needed.

This guidance selects or reviews evidence. It does not authorize creating or running tests or scripts, starting servers, changing code, deploying, accessing a live system, dispatching agents, or persisting validation artifacts.

Source influence: [prove-it-works](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/principle-prove-it-works/SKILL.md), [blast-radius](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/blast-radius/SKILL.md), and [sequence-verifiable-units](https://github.com/cursor/plugins/blob/bdf7aa355337897f167153e05069aca505dae17c/pstack/skills/principle-sequence-verifiable-units/SKILL.md) at `bdf7aa355337897f167153e05069aca505dae17c`. This reference uses original project-specific wording.
