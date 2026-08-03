# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Changed

- Extended `response-simplicity`, `/efficiency`, and `efficiency-auditor` with evidence-based output utility checks for low-value generated output without adding a style detector or new component.
- Added an opt-in code-simplicity focus to `/efficiency` and `efficiency-auditor` for scoped reviews and explicitly requested behavior-preserving improvements without adding a component.

## 2.0.0 - 2026-08-01

### Added

- Added `/efficiency` and the matching `efficiency` skill for before-work budgets, in-progress adjustments, and after-work reviews.
- Added byte-for-byte provenance for the vendored Cursor manifest schema and a reproducible live Cursor smoke procedure.

### Changed

- Expanded `efficiency-auditor` to review either task economy or context reductions.
- Made component validation follow the manifest's declared paths and globs, including rules and symlink boundaries.
- Separated official Cursor structure validation from repository-specific release policy.
- Reduced wording-coupled tests and added negative coverage for manifest discovery, rules, globs, and path safety.
- Updated local installation guidance to use public HTTPS by default.
- Retained the minimal always-on `response-simplicity` rule with flexible clarity principles and protected technical content.

### Removed

- Removed `/budget-efficiency`, `/review-efficiency`, `efficiency-budget`, and `efficiency-review`; use `/efficiency` instead.
- Removed `context-change-auditor`; use `efficiency-auditor` with a context focus instead.

## 1.0.1 - 2026-07-27

### Added

- Restored the repository README, changelog, development package metadata, release checklist, manifest validator, and structural behavior tests.
- Added explicit manifest paths for commands, skills, and agents.

### Changed

- Marked all auditor agents as read-only.
- Strengthened RTK setup guidance around binary identification, dry-runs, verification, and uninstall previews.
- Raised the locally verified native Cursor hook baseline to RTK 0.44.0 and documented distinct `allow` and `ask` verification paths.
- Clarified that Cursor-hook use of custom TOML filters requires RTK 0.44.0 or newer and renewed trust after filter changes.
- Rebuilt the release gate around the focused 1.0 component set.

## 1.0.0 - 2026-07-16

### Added

- Five focused opt-in commands and matching skills for RTK setup, RTK filter design, efficiency budgets, context optimization, and efficiency review.
- Three optional auditors for RTK filters, context changes, and task efficiency.
- Project filter references for safe filter structure and DDEV command surfaces.

### Changed

- Refocused the plugin on lightweight Cursor-native helpers with no recurring always-on context.
- Simplified workflows to use Cursor's native intent, planning, approval, and agent behavior.

### Removed

- Custom approval state machines, fixed delegation thresholds, session-compaction workflows, and always-on rules from the 0.x design.

## 0.5.0 - 2026-07-10

### Added

- Semantic-density guidance and explicit session-compaction workflows.
- Cost budgets, context optimization, RTK filter creation, and evidence-based efficiency review.
- Manifest, frontmatter, policy, link, and context-budget validation.

## 0.4.0 - 2026-07-10

### Added

- Project-scoped RTK snapshots, threshold-based reviewers, and a manual Cursor release gate.
- Vendored official Cursor manifest schema validation and Node test fixtures.

## 0.3.0

- Added project RTK filters and context usage optimization workflows.
