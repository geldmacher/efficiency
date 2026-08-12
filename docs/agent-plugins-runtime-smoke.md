# Agent Plugins v1 runtime smoke

This procedure is deferred until a user approves a specific compatible client, an isolated host state, a model-invocation limit, and a maximum cost. Repository conformance and a generated bundle are not permission to install or run it.

## Preconditions

1. Record the repository commit, dirty status, Node.js version, platform, client name and version, selected model, maximum invocations, and maximum approved cost.
2. Run `npm run release-check` and build `.build/plugins/agent-plugins/geldmacher-efficiency`.
3. Verify that the selected client explicitly supports Agent Plugins 1.0.0 and document any client-specific installation step before executing it.
4. Use a fresh, conflict-free client profile or workspace. Do not load the Cursor or Codex target, another Efficiency copy, or global response-simplicity guidance in the same smoke.
5. Capture the standard target hash before installation.

## Bounded smoke

Use at most two short model invocations unless the approved limit is lower.

1. Install or load only the generated Agent Plugins target using the selected client's documented procedure.
2. Start a fresh conversation and confirm discovery of exactly these four skills: `context-optimization`, `efficiency`, `rtk-filter-design`, and `rtk-setup`.
3. Confirm that `response-simplicity-setup`, Cursor commands, Cursor agents, the Cursor rule, hooks, MCP servers, and extensions are absent.
4. Invoke one portable skill with a read-only request, such as reviewing proposed validation effort. Confirm the response follows the skill without changing repository or global host state. If testing `rtk-setup`, `rtk-filter-design`, or `context-optimization`, confirm that an unknown host path stays generic, uses only documented client surfaces, and reports unavailable integration as unverified.
5. Stop immediately on unexpected components, manifest ambiguity, unapproved tool use, or a cost-limit breach.

## Receipt and cleanup

Record the client, exact target hash, discovered components, prompt count, observed result, cost status, and any deviation. Remove or disable the test installation using the client's documented method and restore the prior client state.

A passing smoke is evidence only for that exact client, version, configuration, model, and bundle hash. It does not prove compatibility with every Agent Plugins client, native Cursor or Codex behavior, Marketplace acceptance, or publication.
