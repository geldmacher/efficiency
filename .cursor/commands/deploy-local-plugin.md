# Deploy local plugin

Operate only on the current plugin repository. Select the exact requested path:

- status: `npm run deploy:status`
- dry run: `npm run deploy:local -- --dry-run`
- standard deploy: `npm run deploy:local`
- full deploy: `npm run deploy:local -- --full`

Run both hosts by default. Append `--cursor-only` for Cursor only or `--codex-only` for Codex only; the host flags work with status, dry-run, standard, and full paths.

The build produces Agent Plugins, Cursor, and Codex bundles, but this command deploys only Cursor and Codex. Treat `.build/plugins/agent-plugins/geldmacher-efficiency` as build and conformance output; do not invent a deployment flag for it.

Do not add an `--all` mode, manually copy bundles, edit the personal Marketplace, delete Codex caches, trust hooks, or restart either host. Report standard-target bundle generation separately from the selected native hosts, installed local versions, receipts, applicable Codex cache verification, dirty provenance, and changed hooks. After a real deployment, require a Cursor reload and/or a new Codex task for the hosts that changed before claiming live activation.
