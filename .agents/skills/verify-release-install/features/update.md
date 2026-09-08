# Update and unchanged repeat

The verifier first installs a generated earlier-version fixture, then the actual current target through the packaged CLI. The selected release directories bind both preview and application; no latest-release lookup occurs during the drive.

Expect the destination manifest and file content to match the current package. The reported backup must contain the earlier plugin and its verifiable matching release files. A repeated invocation against the same release must return `no_op: true`, with no new backup. The driver records CLI output and checks those observations directly. A no-op is installation-state evidence only.
