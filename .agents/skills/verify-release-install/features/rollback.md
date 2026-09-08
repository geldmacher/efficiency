# Failure rollback

The controlled Codex driver records an installed newer cache and then exits unsuccessfully. This exercises a real installer subprocess failure after the native side-effect boundary. It does not inject a failure directly into an internal installer setter.

Expect a nonzero installer exit, the previous source manifest and marketplace bytes restored, and retained attempted release evidence. The report must say `native_installation: unverified_after_failure`, because restored source files do not prove that the cache changed back. The verifier checks that this distinction remains observable.

The failure is expected only in this named scenario. Other failed steps fail the verifier. Cleanup removes the drive's owned homes, cached fixtures and marker files, while preserving the transcripts and final report in a separate temporary evidence directory.
