# Failure and rollback

The controlled Codex driver records an installed newer cache and then exits unsuccessfully. This exercises a real installer subprocess failure after the native side-effect boundary. It does not inject a failure directly into an internal installer setter.

Expect a nonzero installer exit, the new source left in place, and the marketplace bytes rewritten from the bytes this run already held in memory. No backup directory is created. The report must say `native_installation: unverified_after_failure` and tell the operator to reinstall an older GitHub release. Restored marketplace bytes do not prove that the cache changed back.

The same drive rolls the Cursor install back by installing the earlier fixture with `--replace-existing`, then checks that destination and release evidence match that older version and that no backup directory appeared.

The failure is expected only in this named scenario. Other failed steps fail the verifier. Cleanup removes the drive's owned homes, cached fixtures and marker files, while preserving the transcripts and final report in a separate temporary evidence directory.
