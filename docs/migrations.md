# Migrating Efficiency

[Back to Efficiency](../README.md)

## Migrating to 3.0

Efficiency 3.0 gives each portable workflow one name across its skill and Cursor command. The old Cursor command names are removed without compatibility aliases:

| Before 3.0 | 3.0 replacement |
| --- | --- |
| `/optimize-context` | `/context-optimization` |
| `/create-rtk-filter` | `/rtk-filter-design` |
| `/setup-rtk` | `/rtk-setup` |

Agent Plugins and Codex remain skill-only surfaces. The Codex-only `$response-simplicity-setup` adapter is outside this five-workflow name parity.

## Migrating from 1.x

Efficiency 2.0 removed the old aliases; 3.0 keeps the smaller surface:

| 1.x entry point | Replacement |
| --- | --- |
| `/budget-efficiency` | `/efficiency` with a before-work request |
| `/review-efficiency` | `/efficiency` with an in-progress or after-work request |
| `efficiency-budget` | `efficiency` |
| `efficiency-review` | `efficiency` |
| `context-change-auditor` | `efficiency-auditor` with a context focus |

