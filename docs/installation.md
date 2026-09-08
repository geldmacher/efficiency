# Installing Efficiency from a GitHub Release

## Ask your harness to install

In Cursor, use `/install-new-release-from-repo`. In Codex, use `$geldmacher-efficiency:install-new-release-from-repo`. Ask for installation or an update; add "preview only" to inspect without changing plugin or marketplace state. The default is the latest published stable release from `geldmacher/efficiency`, for the invoking harness only. Other Agent Plugins clients can discover the skill but have no supported release archive.

The installer needs Node.js 22 or newer and GitHub HTTPS access. It uses the Node.js standard library, including a bounded reader for the ZIP format emitted by this repository. Git, npm packages, RTK, and the GitHub CLI are not required. It installs exact release files without development-version suffixes. macOS, Linux, and Windows use the same helper; actual OS and host activation evidence must be recorded separately.

For a first installation, or an older version that does not contain this skill, paste this into your harness:

> Installiere das neueste stabile Efficiency-Release aus https://github.com/geldmacher/efficiency für meinen aktuellen Harness. Lies https://github.com/geldmacher/efficiency/blob/main/docs/installation.md und folge dem Abschnitt „First installation without the skill“. Prüfe das passende Release vor der Installation und melde, ob noch eine Aktivierung im Harness nötig ist.

### First installation without the skill

The command is included from release 3.3.0 onward, with `skills/install-new-release-from-repo/SKILL.md`. For older releases, use the manual installation sections below and report that the command is not part of the selected release.

The receiving harness performs these steps without requiring a development checkout:

1. Identify Cursor or Codex from the session, or ask the user if uncertain. Check Node.js 22 or newer. Resolve `https://api.github.com/repos/geldmacher/efficiency/releases/latest` once; require a published, non-prerelease `vMAJOR.MINOR.PATCH` tag. Keep that exact version for all following downloads.
2. Download the matching `geldmacher-efficiency-<host>-v<version>.zip`, `SHA256SUMS`, and `provenance.json` from that release into a new temporary directory. The archive URL must be under `https://github.com/geldmacher/efficiency/releases/download/<tag>/`. Do not run downloaded code yet.
3. Verify exactly the selected ZIP and `provenance.json` using the checksum recipes below. Confirm provenance identifies `geldmacher-efficiency`, `geldmacher/efficiency`, the selected version/tag, and that selected archive. These checks establish consistency with assets obtained from the expected GitHub repository; they are not independent release signatures.
4. Inspect the ZIP with the harness's available archive inspection tools before extraction. Require one `geldmacher-efficiency/` root, regular files/directories only, and reject links, absolute paths, `..`, duplicate paths, backslashes, Windows drive/device paths, and double nesting. Extract only into another newly created temporary directory, never directly into an installed plugin. If safe archive inspection is unavailable, stop with that prerequisite rather than executing an unchecked installer.
5. Locate `geldmacher-efficiency/skills/install-new-release-from-repo/scripts/install-release.mjs` inside the verified extracted package. Invoke it with the selected host and `--release-dir` pointing at the downloaded ZIP/checksum/provenance directory, first with `--dry-run`. It revalidates the archive structure, receipt, manifest, file count and content hash before any installation. If the selected release predates the helper, follow the manual host procedure below instead.
6. Apply with the same helper, host and `--release-dir`, omitting `--dry-run`, under the user's installation request. Follow the helper's conflict and native permission messages. Retain reported backups and recovery evidence, then clean up only the temporary download/extraction directories from this invocation. Finish with the reported host activation step.

### Installed skill and direct helper usage

The skill resolves its helper relative to its own location, so it also works from a Codex cache and when the current working directory is another project. Paths containing spaces must be passed as quoted arguments.

```sh
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --download-dir "/new/temporary/release-directory"
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory" --dry-run
node "/absolute/path/to/skill/scripts/install-release.mjs" --host cursor --release-dir "/new/temporary/release-directory"
```

Substitute `codex` for Codex. These commands also work in PowerShell with actual absolute paths. `--download-dir` creates a new directory and performs only download/verification. `--release-dir` pins already downloaded assets and requires no network. A direct invocation without either option resolves and installs latest in one run. A dry run may download temporary files and inspect the native CLI, but changes no plugin, marketplace, cache, or retained backup.

For Codex, the helper preserves the personal marketplace's existing name, interface and unrelated entries; an existing Efficiency entry must already point at the documented local source. It checks `codex plugin marketplace list --json` resolves the name to the intended personal root before calling `codex plugin add <plugin>@<actual-marketplace-name> --json`, then verifies `codex plugin list --json` plus the selected cache bytes. It respects the current `CODEX_HOME` for cache inspection. It does not manually create or delete cache copies. If the CLI is missing, `status: prepared` reports the exact desktop installation steps still needed. Other CLI errors stop the run.

### Conflicts, backups, and recovery

A successful update retains the previous complete plugin under the reported backup directory, together with its retained release assets when available, `marketplace.before.json` when applicable, and `recovery.json`. Current release evidence is stored in the adjacent `.geldmacher-efficiency.release` directory. Do not remove that evidence if you want future updates to detect local modifications automatically.

An existing installation with newer, locally modified, or untracked bytes requires a concrete replacement decision. Preview displays `previous_version`, the selected version, and `replacement_requires_approval`. Only after the user approves replacing that identified installation may the harness add `--replace-existing`. This preserves the previous directory; it does not override wrong plugin identities, unsafe paths, conflicting marketplace sources, or failed release checks.

After an ordinary failure, the helper restores its previous source and marketplace changes. A failed native Codex operation can leave a different cache installed even when source restoration succeeded: the report then explicitly says `native_installation: unverified_after_failure`. Inspect the retained evidence, reinstall the restored source through the native host, and verify its cache before claiming recovery. For a failed first installation, inspect and remove only this plugin through the host if needed. Never clear the cache directory manually.

For a deliberate rollback, use the retained prior release directory with `--release-dir`, preview, approve the downgrade, then apply with `--replace-existing`. For a pre-installer backup without matching release files, restore the complete saved source directory using the manual host procedure below. Never merge versions. An interrupted process may retain an `.install-lock` directory; inspect its owner and recorded paths before recovering, and remove only the abandoned lock after confirming no installation is running.

The result distinguishes verified downloads, source placement, native installation/cache checks, and live activation. `installed` never proves that a running task loaded the new skill. `prepared` is incomplete native installation. An identical repeat reports `no_op: true`; unchanged source does not require another reload by itself.

## Manual verified download

Each Efficiency GitHub Release contains separate packages for Cursor and Codex. Download only the archive for the intended host plus `SHA256SUMS` and `provenance.json` from the [latest GitHub Release](https://github.com/geldmacher/efficiency/releases/latest). You do not need the other host archive or `RELEASE_NOTES.md` to verify this selected download. Do not install an archive until both the selected archive and `provenance.json` match their entries in `SHA256SUMS`.

## Verify the download

On macOS or Linux, replace the example version and host when necessary, then verify exactly the two downloaded files that are covered by `SHA256SUMS`:

```sh
archive="geldmacher-efficiency-cursor-v3.3.0.zip"

verify_release_file() {
  file="$1"
  checksum_line="$(awk -v file="$file" '$2 == file { print; count++ } END { exit count == 1 ? 0 : 1 }' SHA256SUMS)" || {
    echo "SHA256SUMS must contain exactly one entry for $file" >&2
    exit 1
  }
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s\n' "$checksum_line" | sha256sum -c -
  else
    printf '%s\n' "$checksum_line" | shasum -a 256 -c -
  fi
}

verify_release_file "$archive"
verify_release_file "provenance.json"
```

On Windows PowerShell, the equivalent check selects the exact two entries before comparing their hashes:

```powershell
$archive = "geldmacher-efficiency-cursor-v3.3.0.zip"
$files = @($archive, "provenance.json")
$checksumLines = Get-Content -LiteralPath .\SHA256SUMS

foreach ($file in $files) {
  $pattern = '^(?<hash>[0-9a-fA-F]{64})\s+\*?' + [regex]::Escape($file) + '$'
  $matches = @($checksumLines | Select-String -Pattern $pattern)
  if ($matches.Count -ne 1) {
    throw "SHA256SUMS must contain exactly one entry for $file"
  }
  $expected = $matches[0].Matches[0].Groups['hash'].Value.ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath ".\$file" -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "SHA-256 mismatch for $file"
  }
  Write-Host "$($file): OK"
}
```

`provenance.json` additionally identifies the exact version, tag, repository commit, Git tree, target content hashes, archive hashes, file counts, release-gate result, release-notes hash, and receipt. Confirm that its version, tag, repository, and selected archive name describe the intended release. A checksum or identity mismatch is a hard stop.

Every archive must expand to exactly one top-level `geldmacher-efficiency/` directory. Avoid an additional nesting level such as `geldmacher-efficiency/geldmacher-efficiency/`. Before installation, confirm that the host manifest is located at:

- Cursor: `geldmacher-efficiency/.cursor-plugin/plugin.json`
- Codex: `geldmacher-efficiency/.codex-plugin/plugin.json`

## Cursor

Install the contents at the local Cursor plugin path:

- macOS/Linux: `~/.cursor/plugins/local/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.cursor\plugins\local\geldmacher-efficiency`

For a first installation, extract the archive to a temporary directory and move its single `geldmacher-efficiency` directory to that destination. For an update, keep the current directory as a backup, place the new complete directory at the same path, and do not merge old and new files. Then reload Cursor. Installation on disk and live plugin discovery are separate checks.

To roll back, move the current directory aside, restore the previously retained complete directory, and reload Cursor. Keep the matching old archive, `SHA256SUMS`, and `provenance.json` so the restored bytes remain verifiable.

## Codex

Install the contents at the personal Codex plugin path:

- macOS/Linux: `~/.codex/plugins/geldmacher-efficiency`
- Windows: `%USERPROFILE%\.codex\plugins\geldmacher-efficiency`

The personal Marketplace file is:

- macOS/Linux: `~/.agents/plugins/marketplace.json`
- Windows: `%USERPROFILE%\.agents\plugins\marketplace.json`

For a first installation, this is a complete personal Marketplace document. The `source.path` starts with `./` and is relative to the Marketplace root (the user home directory), not to the `.agents/plugins/` directory:

```json
{
  "name": "geldmacher-personal",
  "interface": {
    "displayName": "Geldmacher Plugins"
  },
  "plugins": [
    {
      "name": "geldmacher-efficiency",
      "source": {
        "source": "local",
        "path": "./.codex/plugins/geldmacher-efficiency"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

If `marketplace.json` already exists, preserve its top-level `name`, `interface`, and every unrelated item in `plugins`. Add or replace only the `geldmacher-efficiency` item shown above; do not replace the whole catalog merely to install this plugin.

Source placement is not installation or activation. After creating or changing the Marketplace entry or its source directory:

1. Fully quit and restart the ChatGPT/Codex desktop app; closing only its window is insufficient.
2. Open the **Plugins Directory**, choose **Geldmacher Plugins** (or the preserved display name of your existing personal Marketplace), and install Efficiency. For an update or rollback, use the available refresh or reinstall action there so the host materializes the selected source again.
3. Confirm that the installed copy exists below `~/.codex/plugins/cache/geldmacher-personal/geldmacher-efficiency/local/` on macOS/Linux or `%USERPROFILE%\.codex\plugins\cache\geldmacher-personal\geldmacher-efficiency\local\` on Windows. If an existing Marketplace keeps another top-level `name`, that name replaces `geldmacher-personal` in the cache path. Local Marketplace plugins run from this cache copy, not directly from `~/.codex/plugins/geldmacher-efficiency`.
4. Review any plugin trust request, then start a new Codex task. An already running task does not prove that the refreshed cache copy is active.

These Marketplace, cache, restart, Plugins Directory, and new-task boundaries follow the [official OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins).

For an update, retain the current source directory and its matching release files as a backup, replace the source with the complete verified directory from the new archive, keep the Marketplace entry pointed at the same path, and repeat all four activation steps above. Verify the manifest version in the refreshed cache copy before starting the new task.

For rollback, restore the retained complete old source directory and its verified release files, keep the Marketplace entry unchanged, and repeat the same restart, Plugins Directory refresh or reinstall, cache-version check, and new-task steps. Do not combine files from different versions and do not treat restored source bytes as proof that the cached installed copy changed.

## Verify the installed layout

After copying, verify that the manifest sits directly below the destination, that its `name` is `geldmacher-efficiency`, and that its `version` matches the selected release. The archive checksum proves downloaded bytes; it does not prove that Cursor reloaded, the Codex Marketplace accepted the entry, or a new Codex task loaded the package. Confirm those host-specific activation steps separately.
