---
name: rtk-update
description: Update an existing Rust Token Killer (RTK) installation to the latest official stable release, then verify and adjust its host integration. Also use for update availability checks or previews; first installation and standalone integration setup belong to rtk-setup.
---

# RTK Update

An explicit invocation without additional instructions requests an update of existing RTK to the latest official stable release, including verification and necessary adjustments to its existing host integration. Explicit read-only or preview requests take precedence.

Before writing a user-facing result, read [the human communication contract](../efficiency/references/human-communication.md) once per task, unless it is already loaded.

Begin with inspection from [the shared lifecycle procedure](../rtk-setup/references/lifecycle.md). If RTK is absent, stop and point to [rtk-setup](../rtk-setup/SKILL.md); this update skill never performs first installation. Otherwise follow the shared procedure within the user's scope. Standalone installation, configuration, removal, or integration checks after an external update belong to the setup skill.

Use [shared integration guidance](../rtk-setup/references/integration.md) for host selection, verification, and reporting. An already-current installation skips package changes but still follows the lifecycle's integration and applicable source-reconciliation steps.
