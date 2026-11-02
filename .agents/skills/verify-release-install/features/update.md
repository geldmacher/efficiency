# Update and unchanged repeat

The verifier first installs a generated earlier-version fixture, then the actual current target through the packaged CLI. The selected release directories bind both preview and application; no latest-release lookup occurs during the drive.

Expect the destination manifest and file content to match the current package. The adjacent `.geldmacher-efficiency.release` directory holds verifiable evidence for that current release. No backup directory is created. A repeated invocation against the same release must return `no_op: true` and still create no backup directory. The driver records CLI output and checks those observations directly. A no-op is installation-state evidence only.

Rollback is a later install of the earlier fixture with `--replace-existing`, followed by installing the current release again so later checks still see the current package.
