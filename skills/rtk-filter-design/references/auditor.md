# RTK Filter Auditor Policy

Assess the project command sources, RTK filters, fixtures, verification results, and representative finite outputs. Check matcher precision, finite-command suitability, diagnostic preservation, trust state, and the risk of hiding failures or changing interactive behavior. The filter schema is unchanged (`schema_version = 1`). Project pipelines (`.rtk/pipeline.toml`, `.rtk/pipelines/*.toml`) also go through `rtk trust` and `rtk untrust`. Pipelines do not replace filters, and their hook rules apply to Claude Code only. Follow [the human communication contract](../../efficiency/references/human-communication.md) for the result.

Return a concise verdict, coverage gaps, diagnostic risks, missing evidence, and the next verification or trust action when useful. Do not edit files or implement filter changes.
